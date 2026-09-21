import { and, asc, desc, eq, gt, ilike, inArray, lt, max, or, sql } from "drizzle-orm";
import { db, type DbExecutor } from "../db/client";
import {
  books,
  type RoadmapCategory,
  type RoadmapDifficulty,
  type RoadmapVisibility,
  roadmapSteps,
  roadmaps,
  users,
} from "../db/schema";
import { escapeLike } from "../lib/db-errors";
import type { Cursor } from "../lib/pagination";
import { afterCursor } from "./helpers";

export type RoadmapRow = typeof roadmaps.$inferSelect;
export type NewRoadmapRow = typeof roadmaps.$inferInsert;
export type RoadmapStepBaseRow = typeof roadmapSteps.$inferSelect;
export type NewRoadmapStepRow = Omit<typeof roadmapSteps.$inferInsert, "position">;

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

export async function findRoadmapById(
  id: string,
  executor: DbExecutor = db,
): Promise<RoadmapRow | null> {
  const [row] = await executor.select().from(roadmaps).where(eq(roadmaps.id, id)).limit(1);
  return row ?? null;
}

export async function findRoadmapBySlug(
  slug: string,
  executor: DbExecutor = db,
): Promise<RoadmapRow | null> {
  const [row] = await executor.select().from(roadmaps).where(eq(roadmaps.slug, slug)).limit(1);
  return row ?? null;
}

/** Step の追加・削除・並べ替えを直列化するために Roadmap 行をロックする */
export async function lockRoadmap(id: string, tx: DbExecutor): Promise<void> {
  await tx.select({ id: roadmaps.id }).from(roadmaps).where(eq(roadmaps.id, id)).for("update");
}

// 一覧・埋め込み用の select。creator と stepCount を含む。
const roadmapSummarySelection = {
  id: roadmaps.id,
  slug: roadmaps.slug,
  title: roadmaps.title,
  description: roadmaps.description,
  category: roadmaps.category,
  difficulty: roadmaps.difficulty,
  estimatedDays: roadmaps.estimatedDays,
  visibility: roadmaps.visibility,
  createdAt: roadmaps.createdAt,
  updatedAt: roadmaps.updatedAt,
  // 相関サブクエリ。列名の解決を Drizzle の出力形式に依存させないよう、修飾名を明示する
  // (circle.repository.ts の memberCount を参照)
  stepCount: sql<number>`(
    select count(*)::int from "roadmap_steps"
    where "roadmap_steps"."roadmap_id" = "roadmaps"."id"
  )`,
  creator: {
    id: users.id,
    name: users.name,
    username: users.username,
    avatarUrl: users.avatarUrl,
  },
};

export type RoadmapSummaryFilter = {
  ids?: string[];
  visibility?: RoadmapVisibility;
  q?: string;
  category?: RoadmapCategory;
  difficulty?: RoadmapDifficulty;
  creatorId?: string;
  creatorUsername?: string;
  /** この Book を Step に含む Roadmap だけに絞る */
  bookId?: string;
  cursor?: Cursor;
  limit: number;
};

export async function listRoadmapSummaries(
  filter: RoadmapSummaryFilter,
  executor: DbExecutor = db,
) {
  if (filter.ids && filter.ids.length === 0) return [];
  const pattern = filter.q ? `%${escapeLike(filter.q)}%` : null;

  return executor
    .select(roadmapSummarySelection)
    .from(roadmaps)
    .innerJoin(users, eq(users.id, roadmaps.creatorId))
    .where(
      and(
        filter.ids ? inArray(roadmaps.id, filter.ids) : undefined,
        filter.visibility ? eq(roadmaps.visibility, filter.visibility) : undefined,
        pattern
          ? or(ilike(roadmaps.title, pattern), ilike(roadmaps.description, pattern))
          : undefined,
        filter.category ? eq(roadmaps.category, filter.category) : undefined,
        filter.difficulty ? eq(roadmaps.difficulty, filter.difficulty) : undefined,
        filter.creatorId ? eq(roadmaps.creatorId, filter.creatorId) : undefined,
        filter.creatorUsername ? eq(users.username, filter.creatorUsername) : undefined,
        filter.bookId
          ? inArray(
              roadmaps.id,
              executor
                .select({ roadmapId: roadmapSteps.roadmapId })
                .from(roadmapSteps)
                .where(eq(roadmapSteps.bookId, filter.bookId)),
            )
          : undefined,
        afterCursor(roadmaps.createdAt, roadmaps.id, filter.cursor),
      ),
    )
    .orderBy(desc(roadmaps.createdAt), desc(roadmaps.id))
    .limit(filter.limit);
}

export type RoadmapSummaryRow = Awaited<ReturnType<typeof listRoadmapSummaries>>[number];

export async function findRoadmapSummaryById(
  id: string,
  executor: DbExecutor = db,
): Promise<RoadmapSummaryRow | null> {
  const [row] = await listRoadmapSummaries({ ids: [id], limit: 1 }, executor);
  return row ?? null;
}

export async function insertRoadmap(
  values: NewRoadmapRow,
  executor: DbExecutor = db,
): Promise<RoadmapRow> {
  const [row] = await executor.insert(roadmaps).values(values).returning();
  if (!row) throw new Error("insertRoadmap returned no row");
  return row;
}

export async function updateRoadmap(
  id: string,
  values: Partial<NewRoadmapRow>,
  executor: DbExecutor = db,
): Promise<void> {
  await executor.update(roadmaps).set(values).where(eq(roadmaps.id, id));
}

export async function deleteRoadmap(id: string, executor: DbExecutor = db): Promise<void> {
  await executor.delete(roadmaps).where(eq(roadmaps.id, id));
}

// ---------------------------------------------------------------------------
// RoadmapStep
// ---------------------------------------------------------------------------

/** position 昇順。Book の要約を含む */
export async function listSteps(roadmapId: string, executor: DbExecutor = db) {
  return executor
    .select({
      id: roadmapSteps.id,
      roadmapId: roadmapSteps.roadmapId,
      position: roadmapSteps.position,
      description: roadmapSteps.description,
      checkpoint: roadmapSteps.checkpoint,
      estimatedDays: roadmapSteps.estimatedDays,
      book: {
        id: books.id,
        title: books.title,
        author: books.author,
        coverImageUrl: books.coverImageUrl,
      },
    })
    .from(roadmapSteps)
    .innerJoin(books, eq(books.id, roadmapSteps.bookId))
    .where(eq(roadmapSteps.roadmapId, roadmapId))
    .orderBy(asc(roadmapSteps.position));
}

export type RoadmapStepRow = Awaited<ReturnType<typeof listSteps>>[number];

export async function findStep(
  roadmapId: string,
  stepId: string,
  executor: DbExecutor = db,
): Promise<RoadmapStepBaseRow | null> {
  const [row] = await executor
    .select()
    .from(roadmapSteps)
    .where(and(eq(roadmapSteps.id, stepId), eq(roadmapSteps.roadmapId, roadmapId)))
    .limit(1);
  return row ?? null;
}

/** 末尾 (max(position) + 1) に追加する。呼び出し側で lockRoadmap 済みであること */
export async function appendStep(values: NewRoadmapStepRow, tx: DbExecutor): Promise<string> {
  const [current] = await tx
    .select({ maxPosition: max(roadmapSteps.position) })
    .from(roadmapSteps)
    .where(eq(roadmapSteps.roadmapId, values.roadmapId));

  const [row] = await tx
    .insert(roadmapSteps)
    .values({ ...values, position: (current?.maxPosition ?? 0) + 1 })
    .returning({ id: roadmapSteps.id });
  if (!row) throw new Error("appendStep returned no row");
  return row.id;
}

export async function updateStep(
  stepId: string,
  values: Partial<NewRoadmapStepRow>,
  executor: DbExecutor = db,
): Promise<void> {
  await executor.update(roadmapSteps).set(values).where(eq(roadmapSteps.id, stepId));
}

/**
 * Step を削除し、後ろの Step の position を 1 つずつ詰める。
 *
 * UNIQUE(roadmap_id, position) は行ごとに検査されるため、
 * `position = position - 1` を一括で実行すると途中で重複して失敗し得る。
 * そこで「一度負の値へ退避 → 正の値へ戻す」の 2 段階で更新する。
 */
export async function deleteStepAndCompact(
  step: { id: string; roadmapId: string; position: number },
  tx: DbExecutor,
): Promise<void> {
  await tx.delete(roadmapSteps).where(eq(roadmapSteps.id, step.id));

  await tx
    .update(roadmapSteps)
    .set({ position: sql`-${roadmapSteps.position}` })
    .where(and(eq(roadmapSteps.roadmapId, step.roadmapId), gt(roadmapSteps.position, step.position)));

  await tx
    .update(roadmapSteps)
    .set({ position: sql`-${roadmapSteps.position} - 1` })
    .where(and(eq(roadmapSteps.roadmapId, step.roadmapId), lt(roadmapSteps.position, 0)));
}

/**
 * Roadmap の全 Step の position を付け直す。
 * deleteStepAndCompact と同じ理由で、まず全 Step を負の値へ退避してから確定値を書く。
 */
export async function applyStepPositions(
  roadmapId: string,
  positions: { stepId: string; position: number }[],
  tx: DbExecutor,
): Promise<void> {
  await tx
    .update(roadmapSteps)
    .set({ position: sql`-${roadmapSteps.position}` })
    .where(eq(roadmapSteps.roadmapId, roadmapId));

  for (const { stepId, position } of positions) {
    await tx
      .update(roadmapSteps)
      .set({ position })
      .where(and(eq(roadmapSteps.id, stepId), eq(roadmapSteps.roadmapId, roadmapId)));
  }
}
