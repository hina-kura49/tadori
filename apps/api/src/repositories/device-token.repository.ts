import { and, eq, inArray, ne } from "drizzle-orm";
import { db, type DbExecutor } from "../db/client";
import { devicePushTokens } from "../db/schema";

export type DevicePushTokenRow = typeof devicePushTokens.$inferSelect;
type NewDevicePushTokenRow = Pick<
  typeof devicePushTokens.$inferInsert,
  "userId" | "expoPushToken" | "platform" | "deviceId"
>;

export async function findByExpoPushToken(
  expoPushToken: string,
  executor: DbExecutor = db,
): Promise<DevicePushTokenRow | null> {
  const [row] = await executor
    .select()
    .from(devicePushTokens)
    .where(eq(devicePushTokens.expoPushToken, expoPushToken))
    .limit(1);
  return row ?? null;
}

export async function deleteById(id: string, executor: DbExecutor = db): Promise<void> {
  await executor.delete(devicePushTokens).where(eq(devicePushTokens.id, id));
}

/** 同じ User が別の deviceId で同じ token を持っていたら消す (token は全体で UNIQUE のため) */
export async function deleteOwnTokenOnOtherDevices(
  params: { userId: string; expoPushToken: string; deviceId: string },
  executor: DbExecutor = db,
): Promise<void> {
  await executor
    .delete(devicePushTokens)
    .where(
      and(
        eq(devicePushTokens.userId, params.userId),
        eq(devicePushTokens.expoPushToken, params.expoPushToken),
        ne(devicePushTokens.deviceId, params.deviceId),
      ),
    );
}

/** (userId, deviceId) で upsert。再登録時は enabled = true に戻す */
export async function upsertForDevice(
  values: NewDevicePushTokenRow,
  executor: DbExecutor = db,
): Promise<DevicePushTokenRow> {
  const now = new Date();
  const [row] = await executor
    .insert(devicePushTokens)
    .values({ ...values, enabled: true, lastUsedAt: now })
    .onConflictDoUpdate({
      target: [devicePushTokens.userId, devicePushTokens.deviceId],
      set: {
        expoPushToken: values.expoPushToken,
        platform: values.platform,
        enabled: true,
        lastUsedAt: now,
        updatedAt: now,
      },
    })
    .returning();
  if (!row) throw new Error("upsertForDevice returned no row");
  return row;
}

/** 無効化できた行数を返す (0 なら該当端末なし) */
export async function disableByDeviceId(
  userId: string,
  deviceId: string,
  executor: DbExecutor = db,
): Promise<number> {
  const rows = await executor
    .update(devicePushTokens)
    .set({ enabled: false })
    .where(and(eq(devicePushTokens.userId, userId), eq(devicePushTokens.deviceId, deviceId)))
    .returning({ id: devicePushTokens.id });
  return rows.length;
}

export async function listEnabledTokensByUserIds(
  userIds: string[],
  executor: DbExecutor = db,
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await executor
    .select({ expoPushToken: devicePushTokens.expoPushToken })
    .from(devicePushTokens)
    .where(and(inArray(devicePushTokens.userId, userIds), eq(devicePushTokens.enabled, true)));
  return rows.map((row) => row.expoPushToken);
}

/** Expo から DeviceNotRegistered が返った token を無効化する */
export async function disableTokens(tokens: string[], executor: DbExecutor = db): Promise<void> {
  if (tokens.length === 0) return;
  await executor
    .update(devicePushTokens)
    .set({ enabled: false })
    .where(inArray(devicePushTokens.expoPushToken, tokens));
}
