import { and, asc, desc, eq, gt, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db, type DbExecutor } from "../db/client";
import {
  type CircleTargetType,
  type CircleVisibility,
  circleInvites,
  circleMembers,
  circleSchedules,
  circles,
  users,
} from "../db/schema";
import { escapeLike } from "../lib/db-errors";
import type { Cursor } from "../lib/pagination";
import { afterCursor } from "./helpers";

export type CircleRow = typeof circles.$inferSelect;
export type NewCircleRow = typeof circles.$inferInsert;
export type CircleMemberRow = typeof circleMembers.$inferSelect;
export type CircleScheduleRow = typeof circleSchedules.$inferSelect;

// ---------------------------------------------------------------------------
// Circle
// ---------------------------------------------------------------------------

export async function findCircleById(
  id: string,
  executor: DbExecutor = db,
  options: { forUpdate?: boolean } = {},
): Promise<CircleRow | null> {
  const query = executor.select().from(circles).where(eq(circles.id, id)).limit(1);
  const [row] = options.forUpdate ? await query.for("update") : await query;
  return row ?? null;
}

const circleSummarySelection = {
  id: circles.id,
  name: circles.name,
  description: circles.description,
  targetType: circles.targetType,
  bookId: circles.bookId,
  roadmapId: circles.roadmapId,
  visibility: circles.visibility,
  startDate: circles.startDate,
  targetEndDate: circles.targetEndDate,
  maxMembers: circles.maxMembers,
  createdAt: circles.createdAt,
  // 相関サブクエリ。Drizzle は JOIN の無い SELECT では列名をテーブル修飾なしで出力するため、
  // ${circles.id} と書くと "id" が circle_members.id に解決されてしまう。修飾名を明示する。
  memberCount: sql<number>`(
    select count(*)::int from "circle_members"
    where "circle_members"."circle_id" = "circles"."id"
  )`,
};

export type CircleSummaryFilter = {
  visibility?: CircleVisibility;
  q?: string;
  targetType?: CircleTargetType;
  roadmapId?: string;
  bookId?: string;
  /** この User が参加している Circle だけに絞る */
  memberUserId?: string;
  ids?: string[];
  cursor?: Cursor;
  limit: number;
};

export async function listCircleSummaries(filter: CircleSummaryFilter, executor: DbExecutor = db) {
  const pattern = filter.q ? `%${escapeLike(filter.q)}%` : null;

  return executor
    .select(circleSummarySelection)
    .from(circles)
    .where(
      and(
        filter.ids ? inArray(circles.id, filter.ids) : undefined,
        filter.visibility ? eq(circles.visibility, filter.visibility) : undefined,
        pattern ? or(ilike(circles.name, pattern), ilike(circles.description, pattern)) : undefined,
        filter.targetType ? eq(circles.targetType, filter.targetType) : undefined,
        filter.roadmapId ? eq(circles.roadmapId, filter.roadmapId) : undefined,
        filter.bookId ? eq(circles.bookId, filter.bookId) : undefined,
        filter.memberUserId
          ? inArray(
              circles.id,
              executor
                .select({ circleId: circleMembers.circleId })
                .from(circleMembers)
                .where(eq(circleMembers.userId, filter.memberUserId)),
            )
          : undefined,
        afterCursor(circles.createdAt, circles.id, filter.cursor),
      ),
    )
    .orderBy(desc(circles.createdAt), desc(circles.id))
    .limit(filter.limit);
}

export type CircleSummaryRow = Awaited<ReturnType<typeof listCircleSummaries>>[number];

export async function insertCircle(values: NewCircleRow, executor: DbExecutor = db) {
  const [row] = await executor.insert(circles).values(values).returning();
  if (!row) throw new Error("insertCircle returned no row");
  return row;
}

export async function updateCircle(
  id: string,
  values: Partial<NewCircleRow>,
  executor: DbExecutor = db,
): Promise<void> {
  await executor.update(circles).set(values).where(eq(circles.id, id));
}

export async function deleteCircle(id: string, executor: DbExecutor = db): Promise<void> {
  await executor.delete(circles).where(eq(circles.id, id));
}

// ---------------------------------------------------------------------------
// CircleMember
// ---------------------------------------------------------------------------

export async function findMembership(
  circleId: string,
  userId: string,
  executor: DbExecutor = db,
): Promise<CircleMemberRow | null> {
  const [row] = await executor
    .select()
    .from(circleMembers)
    .where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function countMembers(circleId: string, executor: DbExecutor = db): Promise<number> {
  return executor.$count(circleMembers, eq(circleMembers.circleId, circleId));
}

/** OWNER が先頭、以降は参加順 */
export async function listMembers(circleId: string, executor: DbExecutor = db) {
  return executor
    .select({
      role: circleMembers.role,
      joinedAt: circleMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(circleMembers)
    .innerJoin(users, eq(users.id, circleMembers.userId))
    .where(eq(circleMembers.circleId, circleId))
    .orderBy(asc(circleMembers.role), asc(circleMembers.joinedAt)); // enum 定義順: OWNER -> MEMBER
}

export type CircleMemberWithUserRow = Awaited<ReturnType<typeof listMembers>>[number];

export async function listMemberUserIds(
  circleId: string,
  executor: DbExecutor = db,
): Promise<string[]> {
  const rows = await executor
    .select({ userId: circleMembers.userId })
    .from(circleMembers)
    .where(eq(circleMembers.circleId, circleId));
  return rows.map((row) => row.userId);
}

export async function insertMember(
  values: typeof circleMembers.$inferInsert,
  executor: DbExecutor = db,
): Promise<void> {
  await executor.insert(circleMembers).values(values);
}

export async function deleteMember(
  circleId: string,
  userId: string,
  executor: DbExecutor = db,
): Promise<void> {
  await executor
    .delete(circleMembers)
    .where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.userId, userId)));
}

// ---------------------------------------------------------------------------
// CircleInvite
// ---------------------------------------------------------------------------

export async function hasInvite(
  circleId: string,
  userId: string,
  executor: DbExecutor = db,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: circleInvites.id })
    .from(circleInvites)
    .where(and(eq(circleInvites.circleId, circleId), eq(circleInvites.invitedUserId, userId)))
    .limit(1);
  return row !== undefined;
}

/** 新しく招待できたら true。既に招待済みなら false */
export async function insertInvite(
  values: typeof circleInvites.$inferInsert,
  executor: DbExecutor = db,
): Promise<boolean> {
  const rows = await executor
    .insert(circleInvites)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: circleInvites.id });
  return rows.length > 0;
}

export async function deleteInvite(
  circleId: string,
  userId: string,
  executor: DbExecutor = db,
): Promise<void> {
  await executor
    .delete(circleInvites)
    .where(and(eq(circleInvites.circleId, circleId), eq(circleInvites.invitedUserId, userId)));
}

// ---------------------------------------------------------------------------
// CircleSchedule
// ---------------------------------------------------------------------------

export async function listSchedules(
  circleId: string,
  executor: DbExecutor = db,
): Promise<CircleScheduleRow[]> {
  return executor
    .select()
    .from(circleSchedules)
    .where(eq(circleSchedules.circleId, circleId))
    .orderBy(asc(circleSchedules.scheduledAt));
}

export async function findSchedule(
  circleId: string,
  scheduleId: string,
  executor: DbExecutor = db,
): Promise<CircleScheduleRow | null> {
  const [row] = await executor
    .select()
    .from(circleSchedules)
    .where(and(eq(circleSchedules.id, scheduleId), eq(circleSchedules.circleId, circleId)))
    .limit(1);
  return row ?? null;
}

export async function insertSchedule(
  values: typeof circleSchedules.$inferInsert,
  executor: DbExecutor = db,
): Promise<CircleScheduleRow> {
  const [row] = await executor.insert(circleSchedules).values(values).returning();
  if (!row) throw new Error("insertSchedule returned no row");
  return row;
}

export async function updateSchedule(
  scheduleId: string,
  values: Partial<typeof circleSchedules.$inferInsert>,
  executor: DbExecutor = db,
): Promise<CircleScheduleRow> {
  const [row] = await executor
    .update(circleSchedules)
    .set(values)
    .where(eq(circleSchedules.id, scheduleId))
    .returning();
  if (!row) throw new Error("updateSchedule returned no row");
  return row;
}

export async function deleteSchedule(scheduleId: string, executor: DbExecutor = db): Promise<void> {
  await executor.delete(circleSchedules).where(eq(circleSchedules.id, scheduleId));
}

/**
 * (now, until] に開催される「リマインド未送信」の Schedule を送信済みにして返す。
 * UPDATE ... RETURNING で原子的に確保するので、複数プロセスが同時に動いても二重送信しない。
 */
export async function claimSchedulesDueForReminder(
  now: Date,
  until: Date,
  executor: DbExecutor = db,
): Promise<CircleScheduleRow[]> {
  return executor
    .update(circleSchedules)
    .set({ reminderSentAt: now })
    .where(
      and(
        isNull(circleSchedules.reminderSentAt),
        gt(circleSchedules.scheduledAt, now),
        lte(circleSchedules.scheduledAt, until),
      ),
    )
    .returning();
}

// ---------------------------------------------------------------------------
// Dashboard 用のまとめ取得
// ---------------------------------------------------------------------------

/** 複数 Circle のメンバーをまとめて取得する。OWNER が先頭、以降は参加順 */
export async function listMembersByCircleIds(circleIds: string[], executor: DbExecutor = db) {
  if (circleIds.length === 0) return [];
  return executor
    .select({
      circleId: circleMembers.circleId,
      role: circleMembers.role,
      joinedAt: circleMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(circleMembers)
    .innerJoin(users, eq(users.id, circleMembers.userId))
    .where(inArray(circleMembers.circleId, circleIds))
    .orderBy(asc(circleMembers.circleId), asc(circleMembers.role), asc(circleMembers.joinedAt));
}

/** 複数 Circle の「これから開催される Schedule」を開催日時の昇順で返す */
export async function listUpcomingSchedulesByCircleIds(
  circleIds: string[],
  now: Date,
  executor: DbExecutor = db,
): Promise<CircleScheduleRow[]> {
  if (circleIds.length === 0) return [];
  return executor
    .select()
    .from(circleSchedules)
    .where(and(inArray(circleSchedules.circleId, circleIds), gt(circleSchedules.scheduledAt, now)))
    .orderBy(asc(circleSchedules.scheduledAt));
}
