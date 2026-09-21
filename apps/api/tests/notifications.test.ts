import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "../src/db/client";
import { devicePushTokens } from "../src/db/schema";
import { expoPushClient } from "../src/lib/expo-push-client";
import { sendPushToUser } from "../src/services/notification.service";
import { api, createUser, registerDevice } from "./helpers/api";

describe("Notification preferences", () => {
  it("未保存なら既定値を返す", async () => {
    const alice = await createUser("alice");
    const response = await api("GET", "/me/notification-preferences", { as: alice });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      studyReminderEnabled: false,
      studyReminderTime: "20:00",
      studyReminderTimezone: "Asia/Tokyo",
      circleReminderEnabled: true,
      progressNotificationEnabled: true,
      inviteNotificationEnabled: true,
    });
  });

  it("部分更新でき、他の User には影響しない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");

    const updated = await api("PATCH", "/me/notification-preferences", {
      as: alice,
      json: { studyReminderEnabled: true, studyReminderTime: "07:30" },
    });
    expect(updated.body).toMatchObject({
      studyReminderEnabled: true,
      studyReminderTime: "07:30",
      circleReminderEnabled: true,
    });

    const again = await api("PATCH", "/me/notification-preferences", {
      as: alice,
      json: { inviteNotificationEnabled: false },
    });
    expect(again.body).toMatchObject({ studyReminderTime: "07:30", inviteNotificationEnabled: false });

    const bobs = await api("GET", "/me/notification-preferences", { as: bob });
    expect(bobs.body.studyReminderEnabled).toBe(false);
  });

  it("時刻と timezone を検証する / 未ログインは 401", async () => {
    const alice = await createUser("alice");
    for (const json of [
      { studyReminderTime: "25:00" },
      { studyReminderTime: "8:00" },
      { studyReminderTimezone: "Mars/Olympus" },
      {},
    ]) {
      const response = await api("PATCH", "/me/notification-preferences", { as: alice, json });
      expect(response.status, JSON.stringify(json)).toBe(400);
    }
    expect((await api("GET", "/me/notification-preferences")).status).toBe(401);
  });
});

describe("Device push tokens", () => {
  it("登録は upsert。同じ deviceId なら token が置き換わる", async () => {
    const alice = await createUser("alice");
    const first = await registerDevice(alice, "one");
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ deviceId: "device-one", platform: "IOS", enabled: true });
    expect(first.body.expoPushToken).toBeUndefined();

    await api("POST", "/me/devices", {
      as: alice,
      json: { expoPushToken: "ExponentPushToken[rotated]", platform: "IOS", deviceId: "device-one" },
    });
    const rows = await db.select().from(devicePushTokens);
    expect(rows.map((row) => row.expoPushToken)).toEqual(["ExponentPushToken[rotated]"]);
  });

  it("1 User が複数端末を持て、すべてに送信される", async () => {
    const alice = await createUser("alice");
    await registerDevice(alice, "phone");
    await registerDevice(alice, "tablet");

    await sendPushToUser(alice.id, { type: "ROADMAP_COMPLETED", title: "t", body: "b" });
    const messages = vi.mocked(expoPushClient.send).mock.calls[0]?.[0] ?? [];
    expect(messages.map((message) => message.to).sort()).toEqual([
      "ExponentPushToken[phone]",
      "ExponentPushToken[tablet]",
    ]);
  });

  it("他 User が有効に使っている token は登録できない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    await registerDevice(alice, "shared");

    const response = await api("POST", "/me/devices", {
      as: bob,
      json: { expoPushToken: "ExponentPushToken[shared]", platform: "IOS", deviceId: "bobs-device" },
    });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe("PUSH_TOKEN_IN_USE");

    const [row] = await db.select().from(devicePushTokens);
    expect(row?.userId).toBe(alice.id);
  });

  it("無効化済みの token は同じ端末の次の User が引き継げる", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    await registerDevice(alice, "shared");
    expect((await api("DELETE", "/me/devices/device-shared", { as: alice })).status).toBe(204);

    expect((await registerDevice(bob, "shared")).status).toBe(200);
    const rows = await db.select().from(devicePushTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: bob.id, enabled: true });
  });

  it("他人の端末は無効化できない。無効化した端末には送信しない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    await registerDevice(alice, "phone");

    expect((await api("DELETE", "/me/devices/device-phone", { as: bob })).status).toBe(404);
    expect((await api("DELETE", "/me/devices/device-phone", { as: alice })).status).toBe(204);

    await sendPushToUser(alice.id, { type: "ROADMAP_COMPLETED", title: "t", body: "b" });
    expect(vi.mocked(expoPushClient.send)).not.toHaveBeenCalled();
  });

  it("不正な形式の token は 400", async () => {
    const alice = await createUser("alice");
    const response = await api("POST", "/me/devices", {
      as: alice,
      json: { expoPushToken: "not-a-token", platform: "IOS", deviceId: "d" },
    });
    expect(response.status).toBe(400);
  });

  it("Expo が DeviceNotRegistered を返した token は無効化される", async () => {
    const alice = await createUser("alice");
    await registerDevice(alice, "gone");
    vi.mocked(expoPushClient.send).mockResolvedValue([
      { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } },
    ]);

    await sendPushToUser(alice.id, { type: "ROADMAP_COMPLETED", title: "t", body: "b" });
    const [row] = await db
      .select()
      .from(devicePushTokens)
      .where(eq(devicePushTokens.userId, alice.id));
    expect(row?.enabled).toBe(false);
  });
});
