import { eq, inArray } from "drizzle-orm";
import { db, type DbExecutor } from "../db/client";
import { notificationPreferences } from "../db/schema";
import type { NotificationPreferenceValues } from "../types/notification";

export type NotificationPreferenceRow = typeof notificationPreferences.$inferSelect;

export async function findByUserId(
  userId: string,
  executor: DbExecutor = db,
): Promise<NotificationPreferenceRow | null> {
  const [row] = await executor
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function findByUserIds(
  userIds: string[],
  executor: DbExecutor = db,
): Promise<NotificationPreferenceRow[]> {
  if (userIds.length === 0) return [];
  return executor
    .select()
    .from(notificationPreferences)
    .where(inArray(notificationPreferences.userId, userIds));
}

/** values は「既定値 + 既存値 + 変更分」をマージ済みの完全な値を渡す */
export async function upsert(
  userId: string,
  values: NotificationPreferenceValues,
  executor: DbExecutor = db,
): Promise<NotificationPreferenceRow> {
  const [row] = await executor
    .insert(notificationPreferences)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  if (!row) throw new Error("upsert notification preference returned no row");
  return row;
}
