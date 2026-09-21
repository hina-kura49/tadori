import { auth } from "../lib/auth";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import * as userRepository from "../repositories/user.repository";
import { db, pool } from "./client";
import {
  books,
  circleMembers,
  circleSchedules,
  circles,
  type RoadmapCategory,
  type RoadmapDifficulty,
  roadmapSteps,
  roadmaps,
} from "./schema";

// Development 用の Seed。`pnpm db:seed` で実行する。
// 既に seed 済み (alice が存在する) なら何もしない。
// 全ユーザーのパスワード: password-1234

const SEED_PASSWORD = "password-1234";

const SEED_USERS = [
  { name: "Alice Tanaka", username: "alice", email: "alice@example.com" },
  { name: "Bob Suzuki", username: "bob", email: "bob@example.com" },
  { name: "Carol Sato", username: "carol", email: "carol@example.com" },
];

type SeedRoadmap = {
  creator: string;
  title: string;
  slug: string;
  description: string;
  category: RoadmapCategory;
  difficulty: RoadmapDifficulty;
  estimatedDays: number;
  steps: { title: string; author: string; isbn13?: string; checkpoint: string; days: number }[];
};

const SEED_ROADMAPS: SeedRoadmap[] = [
  {
    creator: "alice",
    title: "Backend Engineering Foundations",
    slug: "backend-engineering-foundations",
    description: "Web・DB・設計の基礎を 4 冊で固める、バックエンドエンジニア入門ロードマップ。",
    category: "ENGINEERING",
    difficulty: "BEGINNER",
    estimatedDays: 90,
    steps: [
      {
        title: "Webを支える技術",
        author: "山本 陽平",
        isbn13: "9784774142043",
        checkpoint: "HTTPとRESTの基本構造を説明できる",
        days: 14,
      },
      {
        title: "達人に学ぶDB設計 徹底指南書",
        author: "ミック",
        isbn13: "9784798124704",
        checkpoint: "正規化・ER図・論理設計の基本を説明できる",
        days: 21,
      },
      {
        title: "SQLアンチパターン",
        author: "Bill Karwin",
        isbn13: "9784873115894",
        checkpoint: "典型的なDB設計上の失敗を説明できる",
        days: 25,
      },
      {
        title: "Clean Architecture",
        author: "Robert C. Martin",
        isbn13: "9784048930659",
        checkpoint: "レイヤー間の依存方向を説明できる",
        days: 30,
      },
    ],
  },
  {
    creator: "bob",
    title: "Product Management Basics",
    slug: "product-management-basics",
    description: "課題発見から計測まで、プロダクトマネジメントの基本サイクルを 4 冊で学ぶ。",
    category: "PRODUCT",
    difficulty: "BEGINNER",
    estimatedDays: 60,
    steps: [
      {
        title: "INSPIRED",
        author: "Marty Cagan",
        checkpoint: "プロダクトチームの役割と、Discovery と Delivery の違いを説明できる",
        days: 14,
      },
      {
        title: "The Mom Test",
        author: "Rob Fitzpatrick",
        checkpoint: "誘導せずに事実を引き出す顧客インタビューの質問を作れる",
        days: 7,
      },
      {
        title: "Continuous Discovery Habits",
        author: "Teresa Torres",
        checkpoint: "Opportunity Solution Tree を使って機会と解決策を整理できる",
        days: 18,
      },
      {
        title: "Lean Analytics",
        author: "Alistair Croll, Benjamin Yoskovitz",
        checkpoint: "事業ステージに合った One Metric That Matters を選べる",
        days: 21,
      },
    ],
  },
];

async function seed() {
  if (env.NODE_ENV === "production") throw new Error("Refusing to seed in production");
  if (await userRepository.findUserByUsername("alice")) {
    logger.info("Already seeded. Skipping");
    return;
  }

  // 1. Users (Better Auth 経由で作るので、そのままログインできる)
  const userIdByUsername = new Map<string, string>();
  for (const user of SEED_USERS) {
    const result = await auth.api.signUpEmail({ body: { ...user, password: SEED_PASSWORD } });
    userIdByUsername.set(user.username, result.user.id);
  }
  const userId = (username: string) => {
    const id = userIdByUsername.get(username);
    if (!id) throw new Error(`Unknown seed user: ${username}`);
    return id;
  };

  await db.transaction(async (tx) => {
    // 2. Roadmaps + Books + Steps
    const roadmapIdBySlug = new Map<string, string>();
    const bookIdByTitle = new Map<string, string>();

    for (const seedRoadmap of SEED_ROADMAPS) {
      const [roadmap] = await tx
        .insert(roadmaps)
        .values({
          creatorId: userId(seedRoadmap.creator),
          title: seedRoadmap.title,
          slug: seedRoadmap.slug,
          description: seedRoadmap.description,
          category: seedRoadmap.category,
          difficulty: seedRoadmap.difficulty,
          estimatedDays: seedRoadmap.estimatedDays,
          visibility: "PUBLIC",
        })
        .returning();
      if (!roadmap) throw new Error("Failed to insert roadmap");
      roadmapIdBySlug.set(roadmap.slug, roadmap.id);

      for (const [index, step] of seedRoadmap.steps.entries()) {
        const [book] = await tx
          .insert(books)
          .values({ title: step.title, author: step.author, isbn13: step.isbn13 })
          .returning();
        if (!book) throw new Error("Failed to insert book");
        bookIdByTitle.set(book.title, book.id);

        await tx.insert(roadmapSteps).values({
          roadmapId: roadmap.id,
          bookId: book.id,
          position: index + 1,
          checkpoint: step.checkpoint,
          estimatedDays: step.days,
        });
      }
    }

    // 3. Circles (Roadmap Circle と Book Circle を 1 件ずつ)
    const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [roadmapCircle] = await tx
      .insert(circles)
      .values({
        creatorId: userId("alice"),
        name: "Backend 基礎を 3 か月で走り切る会",
        description: "週 1 回、Checkpoint を自分の言葉で説明し合います。",
        targetType: "ROADMAP",
        roadmapId: roadmapIdBySlug.get("backend-engineering-foundations"),
        visibility: "PUBLIC",
        maxMembers: 8,
      })
      .returning();
    const [bookCircle] = await tx
      .insert(circles)
      .values({
        creatorId: userId("bob"),
        name: "The Mom Test 輪読会",
        description: "1 章ずつ読んで、実際のインタビュー質問を持ち寄ります。",
        targetType: "BOOK",
        bookId: bookIdByTitle.get("The Mom Test"),
        visibility: "PUBLIC",
        maxMembers: 5,
      })
      .returning();
    if (!roadmapCircle || !bookCircle) throw new Error("Failed to insert circles");

    await tx.insert(circleMembers).values([
      { circleId: roadmapCircle.id, userId: userId("alice"), role: "OWNER" },
      { circleId: roadmapCircle.id, userId: userId("carol"), role: "MEMBER" },
      { circleId: bookCircle.id, userId: userId("bob"), role: "OWNER" },
    ]);
    await tx.insert(circleSchedules).values({
      circleId: roadmapCircle.id,
      title: "Kickoff: 自己紹介と進め方の確認",
      scheduledAt: inSevenDays,
    });
  });

  logger.info("Seed completed", { users: SEED_USERS.length, roadmaps: SEED_ROADMAPS.length });
}

try {
  await seed();
} finally {
  await pool.end();
}
