import { eq } from "drizzle-orm";
import { db, type DbExecutor } from "../db/client";
import { users } from "../db/schema";

export type UserRow = typeof users.$inferSelect;

export async function findUserById(id: string, executor: DbExecutor = db): Promise<UserRow | null> {
  const [row] = await executor.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function findUserByUsername(
  username: string,
  executor: DbExecutor = db,
): Promise<UserRow | null> {
  const [row] = await executor.select().from(users).where(eq(users.username, username)).limit(1);
  return row ?? null;
}

export async function updateUserProfile(
  id: string,
  values: Partial<Pick<UserRow, "name" | "username" | "usernameConfirmed" | "bio" | "avatarUrl">>,
  executor: DbExecutor = db,
): Promise<UserRow | null> {
  const [row] = await executor.update(users).set(values).where(eq(users.id, id)).returning();
  return row ?? null;
}

/** 関連データ (Roadmap・進捗・Circle・端末・session など) は FK の CASCADE で消える */
export async function deleteUser(id: string, executor: DbExecutor = db): Promise<void> {
  await executor.delete(users).where(eq(users.id, id));
}
