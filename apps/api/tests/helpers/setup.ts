import { sql } from "drizzle-orm";
import { afterAll, beforeEach, vi } from "vitest";
import { db, pool } from "../../src/db/client";
import { expoPushClient } from "../../src/lib/expo-push-client";

// 各テストの前に全テーブルを空にし、Expo Push API への送信を mock する。
// テストからは `vi.mocked(expoPushClient.send)` で呼び出し内容を検証できる。

beforeEach(async () => {
  await db.execute(sql`
    truncate table
      users, sessions, accounts, verifications,
      books, roadmaps, roadmap_steps, user_roadmaps, user_roadmap_step_progress,
      circles, circle_members, circle_invites, circle_schedules,
      device_push_tokens, notification_preferences
    restart identity cascade
  `);

  vi.restoreAllMocks();
  vi.spyOn(expoPushClient, "send").mockImplementation(async (messages) =>
    messages.map((_, index) => ({ status: "ok" as const, id: `ticket-${index}` })),
  );
});

afterAll(async () => {
  await pool.end();
});
