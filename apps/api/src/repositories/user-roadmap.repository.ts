import { and, asc, countDistinct, desc, eq, inArray } from "drizzle-orm";
import { db, type DbExecutor } from "../db/client";
import {
  books,
  roadmapSteps,
  roadmaps,
  type UserRoadmapStatus,
  userRoadmapStepProgress,
  userRoadmaps,
} from "../db/schema";

export type UserRoadmapRow = typeof userRoadmaps.$inferSelect;
type StepProgressValues = Pick<
  typeof userRoadmapStepProgress.$inferInsert,
  "status" | "progressType" | "progressValue" | "startedAt" | "completedAt"
>;

// ---------------------------------------------------------------------------
// UserRoadmap
// ---------------------------------------------------------------------------

export async function findUserRoadmapById(
  id: string,
  executor: DbExecutor = db,
  options: { forUpdate?: boolean } = {},
): Promise<UserRoadmapRow | null> {
  const query = executor.select().from(userRoadmaps).where(eq(userRoadmaps.id, id)).limit(1);
  const [row] = options.forUpdate ? await query.for("update") : await query;
  return row ?? null;
}

export async function findUserRoadmapByUserAndRoadmap(
  userId: string,
  roadmapId: string,
  executor: DbExecutor = db,
): Promise<UserRoadmapRow | null> {
  const [row] = await executor
    .select()
    .from(userRoadmaps)
    .where(and(eq(userRoadmaps.userId, userId), eq(userRoadmaps.roadmapId, roadmapId)))
    .limit(1);
  return row ?? null;
}

/** Roadmap の要約つき。新しく開始した順 */
export async function listUserRoadmaps(
  filter: {
    userId: string;
    ids?: string[];
    status?: UserRoadmapStatus;
    /** true なら PUBLIC Roadmap のものだけ (公開 Profile 用) */
    publicOnly?: boolean;
    limit?: number;
  },
  executor: DbExecutor = db,
) {
  const query = executor
    .select({
      id: userRoadmaps.id,
      userId: userRoadmaps.userId,
      status: userRoadmaps.status,
      startedAt: userRoadmaps.startedAt,
      completedAt: userRoadmaps.completedAt,
      roadmap: {
        id: roadmaps.id,
        slug: roadmaps.slug,
        title: roadmaps.title,
        category: roadmaps.category,
        difficulty: roadmaps.difficulty,
      },
    })
    .from(userRoadmaps)
    .innerJoin(roadmaps, eq(roadmaps.id, userRoadmaps.roadmapId))
    .where(
      and(
        eq(userRoadmaps.userId, filter.userId),
        filter.ids ? inArray(userRoadmaps.id, filter.ids) : undefined,
        filter.status ? eq(userRoadmaps.status, filter.status) : undefined,
        filter.publicOnly ? eq(roadmaps.visibility, "PUBLIC") : undefined,
      ),
    )
    .orderBy(desc(userRoadmaps.createdAt), desc(userRoadmaps.id));

  return filter.limit ? query.limit(filter.limit) : query;
}

export type UserRoadmapWithRoadmapRow = Awaited<ReturnType<typeof listUserRoadmaps>>[number];

export async function insertUserRoadmap(
  values: typeof userRoadmaps.$inferInsert,
  executor: DbExecutor = db,
): Promise<UserRoadmapRow> {
  const [row] = await executor.insert(userRoadmaps).values(values).returning();
  if (!row) throw new Error("insertUserRoadmap returned no row");
  return row;
}

export async function updateUserRoadmap(
  id: string,
  values: Partial<Pick<UserRoadmapRow, "status" | "startedAt" | "completedAt">>,
  executor: DbExecutor = db,
): Promise<void> {
  await executor.update(userRoadmaps).set(values).where(eq(userRoadmaps.id, id));
}

// ---------------------------------------------------------------------------
// UserRoadmapStepProgress
// ---------------------------------------------------------------------------

export async function insertStepProgressRows(
  rows: (typeof userRoadmapStepProgress.$inferInsert)[],
  executor: DbExecutor = db,
): Promise<void> {
  if (rows.length === 0) return;
  await executor.insert(userRoadmapStepProgress).values(rows);
}

/**
 * 指定した UserRoadmap の「全 Step + その進捗」を position 順で返す。
 *
 * Roadmap 開始後に creator が Step を追加すると進捗行が存在しないことがあるため、
 * LEFT JOIN し、行が無い Step は NOT_STARTED として扱う。
 */
export async function listStepsWithProgress(userRoadmapIds: string[], executor: DbExecutor = db) {
  if (userRoadmapIds.length === 0) return [];

  const rows = await executor
    .select({
      userRoadmapId: userRoadmaps.id,
      stepId: roadmapSteps.id,
      position: roadmapSteps.position,
      checkpoint: roadmapSteps.checkpoint,
      book: {
        id: books.id,
        title: books.title,
        author: books.author,
        coverImageUrl: books.coverImageUrl,
      },
      status: userRoadmapStepProgress.status,
      progressType: userRoadmapStepProgress.progressType,
      progressValue: userRoadmapStepProgress.progressValue,
      startedAt: userRoadmapStepProgress.startedAt,
      completedAt: userRoadmapStepProgress.completedAt,
    })
    .from(userRoadmaps)
    .innerJoin(roadmapSteps, eq(roadmapSteps.roadmapId, userRoadmaps.roadmapId))
    .innerJoin(books, eq(books.id, roadmapSteps.bookId))
    .leftJoin(
      userRoadmapStepProgress,
      and(
        eq(userRoadmapStepProgress.userRoadmapId, userRoadmaps.id),
        eq(userRoadmapStepProgress.roadmapStepId, roadmapSteps.id),
      ),
    )
    .where(inArray(userRoadmaps.id, userRoadmapIds))
    .orderBy(asc(userRoadmaps.id), asc(roadmapSteps.position));

  return rows.map((row) => ({
    ...row,
    status: row.status ?? ("NOT_STARTED" as const),
    progressType: row.progressType ?? ("NONE" as const),
  }));
}

export type StepWithProgressRow = Awaited<ReturnType<typeof listStepsWithProgress>>[number];

export async function upsertStepProgress(
  userRoadmapId: string,
  roadmapStepId: string,
  values: StepProgressValues,
  executor: DbExecutor = db,
): Promise<void> {
  await executor
    .insert(userRoadmapStepProgress)
    .values({ userRoadmapId, roadmapStepId, ...values })
    .onConflictDoUpdate({
      target: [userRoadmapStepProgress.userRoadmapId, userRoadmapStepProgress.roadmapStepId],
      set: { ...values, updatedAt: new Date() },
    });
}

// ---------------------------------------------------------------------------
// Profile 用の集計
// ---------------------------------------------------------------------------

/** 完了した Step の Book 数 (同じ Book を複数 Roadmap で読んでも 1 冊) */
export async function countCompletedBooks(userId: string, executor: DbExecutor = db) {
  const [row] = await executor
    .select({ count: countDistinct(roadmapSteps.bookId) })
    .from(userRoadmapStepProgress)
    .innerJoin(userRoadmaps, eq(userRoadmaps.id, userRoadmapStepProgress.userRoadmapId))
    .innerJoin(roadmapSteps, eq(roadmapSteps.id, userRoadmapStepProgress.roadmapStepId))
    .where(and(eq(userRoadmaps.userId, userId), eq(userRoadmapStepProgress.status, "COMPLETED")));
  return row?.count ?? 0;
}

export async function countCompletedRoadmaps(userId: string, executor: DbExecutor = db) {
  return executor.$count(
    userRoadmaps,
    and(eq(userRoadmaps.userId, userId), eq(userRoadmaps.status, "COMPLETED")),
  );
}

// ---------------------------------------------------------------------------
// Circle のメンバー進捗用
// ---------------------------------------------------------------------------

/** 指定した User たちの UserRoadmap (roadmapIds に含まれるものだけ) */
export async function listUserRoadmapsOfUsers(
  userIds: string[],
  roadmapIds: string[],
  executor: DbExecutor = db,
): Promise<UserRoadmapRow[]> {
  if (userIds.length === 0 || roadmapIds.length === 0) return [];
  return executor
    .select()
    .from(userRoadmaps)
    .where(and(inArray(userRoadmaps.userId, userIds), inArray(userRoadmaps.roadmapId, roadmapIds)));
}

/** 指定した User たちが、指定した Book の Step に付けた進捗 (どの Roadmap 経由かは問わない) */
export async function listBookProgressOfUsers(
  userIds: string[],
  bookIds: string[],
  executor: DbExecutor = db,
) {
  if (userIds.length === 0 || bookIds.length === 0) return [];
  return executor
    .select({
      userId: userRoadmaps.userId,
      bookId: roadmapSteps.bookId,
      status: userRoadmapStepProgress.status,
      progressType: userRoadmapStepProgress.progressType,
      progressValue: userRoadmapStepProgress.progressValue,
    })
    .from(userRoadmapStepProgress)
    .innerJoin(userRoadmaps, eq(userRoadmaps.id, userRoadmapStepProgress.userRoadmapId))
    .innerJoin(roadmapSteps, eq(roadmapSteps.id, userRoadmapStepProgress.roadmapStepId))
    .where(and(inArray(userRoadmaps.userId, userIds), inArray(roadmapSteps.bookId, bookIds)));
}
