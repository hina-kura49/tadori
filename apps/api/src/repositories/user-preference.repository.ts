import { eq } from "drizzle-orm";
import { db, type DbExecutor } from "../db/client";
import { userPreferences } from "../db/schema";
import type { UserPreferenceValues } from "../types/preference";

export type UserPreferenceRow = typeof userPreferences.$inferSelect;

export async function findByUserId(
  userId: string,
  executor: DbExecutor = db,
): Promise<UserPreferenceRow | null> {
  const [row] = await executor
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return row ?? null;
}

/** values は「既定値 + 既存値 + 変更分」をマージ済みの完全な値を渡す */
export async function upsert(
  userId: string,
  values: UserPreferenceValues,
  executor: DbExecutor = db,
): Promise<UserPreferenceRow> {
  const [row] = await executor
    .insert(userPreferences)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  if (!row) throw new Error("upsert user preference returned no row");
  return row;
}
