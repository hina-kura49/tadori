import { describe, expect, it, vi } from "vitest";
import { expoPushClient } from "../src/lib/expo-push-client";
import { sendDueCircleMeetingReminders } from "../src/services/notification.service";
import {
  api,
  createBook,
  createRoadmap,
  createUser,
  registerDevice,
  type TestUser,
} from "./helpers/api";

async function createBookCircle(owner: TestUser, overrides: Record<string, unknown> = {}) {
  const book = await createBook("Circle Book");
  const response = await api("POST", "/circles", {
    as: owner,
    json: { name: "DB 設計を読む会", targetType: "BOOK", bookId: book.id, ...overrides },
  });
  if (response.status !== 201) throw new Error(`createCircle failed: ${response.status}`);
  return response.body;
}

describe("Circle create", () => {
  it("Book Circle を作ると作成者が OWNER になる", async () => {
    const alice = await createUser("alice");
    const circle = await createBookCircle(alice);

    expect(circle).toMatchObject({
      targetType: "BOOK",
      visibility: "PUBLIC",
      maxMembers: 10,
      memberCount: 1,
      target: { type: "BOOK", book: { title: "Circle Book" } },
      viewer: { role: "OWNER", isInvited: false },
    });
    expect(circle.members[0]).toMatchObject({ role: "OWNER", user: { username: "alice" } });
  });

  it("Roadmap Circle を作れる", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { stepCount: 1 });
    const response = await api("POST", "/circles", {
      as: alice,
      json: { name: "Roadmap 会", targetType: "ROADMAP", roadmapId: roadmap.id },
    });

    expect(response.status).toBe(201);
    expect(response.body.target).toEqual({
      type: "ROADMAP",
      roadmap: { id: roadmap.id, slug: roadmap.slug, title: roadmap.title },
    });
  });

  it("targetType と対象 ID の不整合・存在しない対象は拒否する", async () => {
    const alice = await createUser("alice");
    const book = await createBook("Book");

    const mismatch = await api("POST", "/circles", {
      as: alice,
      json: { name: "x", targetType: "ROADMAP", bookId: book.id },
    });
    expect(mismatch.status).toBe(400);

    const missing = await api("POST", "/circles", {
      as: alice,
      json: { name: "x", targetType: "BOOK", bookId: crypto.randomUUID() },
    });
    expect(missing.body.code).toBe("BOOK_NOT_FOUND");
  });

  it("他人の PRIVATE Roadmap は対象にできず、PUBLIC Circle は PRIVATE Roadmap を対象にできない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const roadmap = await createRoadmap(alice, { visibility: "PRIVATE" });

    const byOther = await api("POST", "/circles", {
      as: bob,
      json: { name: "x", targetType: "ROADMAP", roadmapId: roadmap.id },
    });
    expect(byOther.body.code).toBe("ROADMAP_NOT_FOUND");

    const publicCircle = await api("POST", "/circles", {
      as: alice,
      json: { name: "x", targetType: "ROADMAP", roadmapId: roadmap.id },
    });
    expect(publicCircle.body.code).toBe("CIRCLE_INVALID_TARGET");
  });
});

describe("Circle join / leave", () => {
  it("PUBLIC Circle に参加でき、既存メンバーへ通知される", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    await registerDevice(alice, "alice-phone");
    await registerDevice(bob, "bob-phone");
    const circle = await createBookCircle(alice);

    const joined = await api("POST", `/circles/${circle.id}/join`, { as: bob });
    expect(joined.status).toBe(200);
    expect(joined.body.memberCount).toBe(2);
    expect(joined.body.viewer.role).toBe("MEMBER");

    const send = vi.mocked(expoPushClient.send);
    expect(send).toHaveBeenCalledTimes(1);
    const messages = send.mock.calls[0]?.[0] ?? [];
    expect(messages.map((message) => message.to)).toEqual(["ExponentPushToken[alice-phone]"]);
    expect(messages[0]?.data).toMatchObject({
      type: "CIRCLE_JOIN",
      circleId: circle.id,
      url: `tadori://circles/${circle.id}`,
    });
  });

  it("二重参加は 409", async () => {
    const alice = await createUser("alice");
    const circle = await createBookCircle(alice);
    const response = await api("POST", `/circles/${circle.id}/join`, { as: alice });
    expect(response.body.code).toBe("CIRCLE_ALREADY_MEMBER");
  });

  it("maxMembers に達していると参加できない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const carol = await createUser("carol");
    const circle = await createBookCircle(alice, { maxMembers: 2 });

    expect((await api("POST", `/circles/${circle.id}/join`, { as: bob })).status).toBe(200);
    const full = await api("POST", `/circles/${circle.id}/join`, { as: carol });
    expect(full.status).toBe(409);
    expect(full.body.code).toBe("CIRCLE_FULL");
  });

  it("同時に参加しても maxMembers を超えない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const carol = await createUser("carol");
    const circle = await createBookCircle(alice, { maxMembers: 2 });

    const results = await Promise.all([
      api("POST", `/circles/${circle.id}/join`, { as: bob }),
      api("POST", `/circles/${circle.id}/join`, { as: carol }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);

    const detail = await api("GET", `/circles/${circle.id}`);
    expect(detail.body.memberCount).toBe(2);
  });

  it("MEMBER は退出できるが OWNER は退出できない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const circle = await createBookCircle(alice);
    await api("POST", `/circles/${circle.id}/join`, { as: bob });

    expect((await api("POST", `/circles/${circle.id}/leave`, { as: bob })).status).toBe(204);
    const owner = await api("POST", `/circles/${circle.id}/leave`, { as: alice });
    expect(owner.status).toBe(409);
    expect(owner.body.code).toBe("CIRCLE_OWNER_CANNOT_LEAVE");
  });
});

describe("Circle authorization", () => {
  it("更新・削除・Schedule 作成は OWNER のみ", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const circle = await createBookCircle(alice);
    await api("POST", `/circles/${circle.id}/join`, { as: bob });

    const update = await api("PATCH", `/circles/${circle.id}`, { as: bob, json: { name: "x" } });
    expect(update.status).toBe(403);
    const schedule = await api("POST", `/circles/${circle.id}/schedules`, {
      as: bob,
      json: { title: "x", scheduledAt: "2030-01-01T10:00:00+09:00" },
    });
    expect(schedule.status).toBe(403);
    expect((await api("DELETE", `/circles/${circle.id}`, { as: bob })).status).toBe(403);

    const byOwner = await api("PATCH", `/circles/${circle.id}`, {
      as: alice,
      json: { name: "Renamed" },
    });
    expect(byOwner.body.name).toBe("Renamed");
    expect((await api("DELETE", `/circles/${circle.id}`, { as: alice })).status).toBe(204);
  });

  it("maxMembers を現在の人数未満にはできない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const carol = await createUser("carol");
    const circle = await createBookCircle(alice, { maxMembers: 5 });
    await api("POST", `/circles/${circle.id}/join`, { as: bob });
    await api("POST", `/circles/${circle.id}/join`, { as: carol });

    const response = await api("PATCH", `/circles/${circle.id}`, {
      as: alice,
      json: { maxMembers: 2 },
    });
    expect(response.status).toBe(400);
  });

  it("INVITE_ONLY は一覧に出ず、メンバーと招待された User だけが閲覧・参加できる", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const carol = await createUser("carol");
    await registerDevice(bob, "bob-phone");
    const circle = await createBookCircle(alice, { visibility: "INVITE_ONLY" });

    expect((await api("GET", "/circles")).body.items).toEqual([]);
    expect((await api("GET", `/circles/${circle.id}`)).status).toBe(404);
    expect((await api("GET", `/circles/${circle.id}`, { as: bob })).status).toBe(404);
    expect((await api("POST", `/circles/${circle.id}/join`, { as: bob })).status).toBe(404);

    // 招待は OWNER のみ
    const byOutsider = await api("POST", `/circles/${circle.id}/invites`, {
      as: carol,
      json: { username: "bob" },
    });
    expect(byOutsider.status).toBe(404);

    const invite = await api("POST", `/circles/${circle.id}/invites`, {
      as: alice,
      json: { username: "bob" },
    });
    expect(invite.status).toBe(204);
    expect(vi.mocked(expoPushClient.send).mock.calls[0]?.[0][0]).toMatchObject({
      to: "ExponentPushToken[bob-phone]",
      data: { type: "CIRCLE_INVITE" },
    });

    const visible = await api("GET", `/circles/${circle.id}`, { as: bob });
    expect(visible.body.viewer).toEqual({ role: null, isInvited: true });
    expect((await api("POST", `/circles/${circle.id}/join`, { as: bob })).status).toBe(200);
    expect((await api("GET", `/circles/${circle.id}`, { as: carol })).status).toBe(404);

    const mine = await api("GET", "/me/circles", { as: bob });
    expect(mine.body.items).toHaveLength(1);
  });
});

describe("Circle list", () => {
  it("bookId / targetType / q で絞り込める", async () => {
    const alice = await createUser("alice");
    const circle = await createBookCircle(alice);
    const roadmap = await createRoadmap(alice);
    await api("POST", "/circles", {
      as: alice,
      json: { name: "Roadmap 会", targetType: "ROADMAP", roadmapId: roadmap.id },
    });

    const bob = await createUser("bob");
    await api("POST", `/circles/${circle.id}/join`, { as: bob });

    const all = await api("GET", "/circles");
    expect(all.body.items).toHaveLength(2);
    expect(
      all.body.items.map((item: { memberCount: number }) => item.memberCount).sort(),
    ).toEqual([1, 2]);
    const byBook = await api("GET", `/circles?bookId=${circle.bookId}`);
    expect(byBook.body.items.map((item: { id: string }) => item.id)).toEqual([circle.id]);
    expect((await api("GET", "/circles?targetType=ROADMAP")).body.items).toHaveLength(1);
    expect((await api("GET", `/circles?q=${encodeURIComponent("設計")}`)).body.items).toHaveLength(1);
    expect((await api("GET", "/circles?visibility=INVITE_ONLY")).status).toBe(400);
  });
});

describe("Circle schedules", () => {
  it("OWNER は Schedule を作成・更新・削除できる", async () => {
    const alice = await createUser("alice");
    const circle = await createBookCircle(alice);

    const created = await api("POST", `/circles/${circle.id}/schedules`, {
      as: alice,
      json: { title: "第 1 回", scheduledAt: "2030-01-01T10:00:00+09:00" },
    });
    expect(created.status).toBe(201);
    expect(created.body.scheduledAt).toBe("2030-01-01T01:00:00.000Z");

    const updated = await api("PATCH", `/circles/${circle.id}/schedules/${created.body.id}`, {
      as: alice,
      json: { title: "第 1 回 (変更)" },
    });
    expect(updated.body.title).toBe("第 1 回 (変更)");

    const detail = await api("GET", `/circles/${circle.id}`);
    expect(detail.body.schedules).toHaveLength(1);

    const removed = await api("DELETE", `/circles/${circle.id}/schedules/${created.body.id}`, {
      as: alice,
    });
    expect(removed.status).toBe(204);
  });

  it("Meeting Reminder は開催 60 分以内の Schedule に 1 回だけ送られる", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    await registerDevice(alice, "alice-phone");
    await registerDevice(bob, "bob-phone");
    const circle = await createBookCircle(alice);
    await api("POST", `/circles/${circle.id}/join`, { as: bob });
    await api("PATCH", "/me/notification-preferences", {
      as: bob,
      json: { circleReminderEnabled: false },
    });
    vi.mocked(expoPushClient.send).mockClear();

    const now = new Date("2030-01-01T00:00:00Z");
    await api("POST", `/circles/${circle.id}/schedules`, {
      as: alice,
      json: { title: "Soon", scheduledAt: "2030-01-01T00:30:00Z" },
    });
    await api("POST", `/circles/${circle.id}/schedules`, {
      as: alice,
      json: { title: "Later", scheduledAt: "2030-01-01T05:00:00Z" },
    });

    expect(await sendDueCircleMeetingReminders(now)).toBe(1);
    expect(await sendDueCircleMeetingReminders(now)).toBe(0);

    const send = vi.mocked(expoPushClient.send);
    expect(send).toHaveBeenCalledTimes(1);
    // bob は circleReminderEnabled = false なので alice だけに届く
    expect(send.mock.calls[0]?.[0].map((message) => message.to)).toEqual([
      "ExponentPushToken[alice-phone]",
    ]);
    expect(send.mock.calls[0]?.[0][0]).toMatchObject({
      body: "Soon",
      data: { type: "CIRCLE_MEETING_REMINDER" },
    });
  });
});
