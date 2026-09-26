import { describe, expect, it } from "vitest";
import { api, createBook, createRoadmap, createUser } from "./helpers/api";

type Named = { title?: string; name?: string };
const titles = (rows: Named[]) => rows.map((row) => row.title ?? row.name).sort();

describe("GET /me/dashboard", () => {
  it("未ログインは 401", async () => {
    expect((await api("GET", "/me/dashboard")).status).toBe(401);
  });

  it("PUBLIC と自分のものだけを返し、他人の PRIVATE / UNLISTED / INVITE_ONLY は含めない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    await createRoadmap(alice, { title: "Alice Public", visibility: "PUBLIC", stepCount: 2 });
    await createRoadmap(alice, { title: "Alice Private", visibility: "PRIVATE", stepCount: 1 });
    await createRoadmap(bob, { title: "Bob Private", visibility: "PRIVATE", stepCount: 1 });
    await createRoadmap(bob, { title: "Bob Unlisted", visibility: "UNLISTED", stepCount: 1 });

    const book = await createBook("Circle Book");
    await api("POST", "/circles", {
      as: bob,
      json: { name: "Bob Secret", targetType: "BOOK", bookId: book.id, visibility: "INVITE_ONLY" },
    });
    await api("POST", "/circles", {
      as: bob,
      json: { name: "Bob Open", targetType: "BOOK", bookId: book.id },
    });

    const dashboard = await api("GET", "/me/dashboard", { as: alice });
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.user).toMatchObject({ username: "alice", usernameConfirmed: true });
    expect(titles(dashboard.body.roadmaps)).toEqual(["Alice Private", "Alice Public"]);
    expect(titles(dashboard.body.circles)).toEqual(["Bob Open"]);

    const publicRoadmap = dashboard.body.roadmaps.find((r: Named) => r.title === "Alice Public");
    expect(publicRoadmap.steps.map((step: { position: number }) => step.position)).toEqual([1, 2]);
    expect(publicRoadmap.completedUserCount).toBe(0);
    // Step の Book と Circle の対象 Book が books に入っている
    expect(titles(dashboard.body.books)).toEqual(
      expect.arrayContaining(["Book 1", "Book 2", "Circle Book"]),
    );
    expect(dashboard.body.notificationPreferences.studyReminderTime).toBe("20:00");
  });

  it("学習中の UNLISTED Roadmap と自分の進捗を含む。完走すると completedUserCount が増える", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const roadmap = await createRoadmap(bob, { title: "Unlisted", visibility: "UNLISTED", stepCount: 2 });
    const started = await api("POST", `/roadmaps/${roadmap.id}/start`, { as: alice });
    const base = `/me/roadmaps/${started.body.userRoadmapId}/steps`;
    await api("PATCH", `${base}/${roadmap.steps[0]?.id}`, { as: alice, json: { status: "COMPLETED" } });
    await api("PATCH", `${base}/${roadmap.steps[1]?.id}`, {
      as: alice,
      json: { progressType: "PERCENTAGE", progressValue: "40" },
    });

    const dashboard = await api("GET", "/me/dashboard", { as: alice });
    expect(titles(dashboard.body.roadmaps)).toEqual(["Unlisted"]);
    expect(dashboard.body.userRoadmaps).toHaveLength(1);
    expect(dashboard.body.userRoadmaps[0]).toMatchObject({
      userRoadmapId: started.body.userRoadmapId,
      roadmapId: roadmap.id,
      status: "IN_PROGRESS",
    });
    expect(
      dashboard.body.userRoadmaps[0].steps.map((step: { status: string; progressValue: string }) => [
        step.status,
        step.progressValue,
      ]),
    ).toEqual([
      ["COMPLETED", null],
      ["READING", "40"],
    ]);

    await api("PATCH", `${base}/${roadmap.steps[1]?.id}`, { as: alice, json: { status: "COMPLETED" } });
    const after = await api("GET", "/me/dashboard", { as: alice });
    expect(after.body.roadmaps[0].completedUserCount).toBe(1);
  });

  it("メンバーの進捗は、自分も参加している Circle でだけ共有される", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const carol = await createUser("carol");
    const roadmap = await createRoadmap(alice, { stepCount: 3 });
    const circle = await api("POST", "/circles", {
      as: alice,
      json: { name: "Together", targetType: "ROADMAP", roadmapId: roadmap.id },
    });
    await api("POST", `/circles/${circle.body.id}/join`, { as: bob });
    await api("POST", `/circles/${circle.body.id}/schedules`, {
      as: alice,
      json: { title: "Kickoff", scheduledAt: "2099-01-01T10:00:00Z" },
    });

    // bob: 1 冊目を完了し、2 冊目を 25% まで進めた
    const started = await api("POST", `/roadmaps/${roadmap.id}/start`, { as: bob });
    const base = `/me/roadmaps/${started.body.userRoadmapId}/steps`;
    await api("PATCH", `${base}/${roadmap.steps[0]?.id}`, { as: bob, json: { status: "COMPLETED" } });
    await api("PATCH", `${base}/${roadmap.steps[1]?.id}`, {
      as: bob,
      json: { progressType: "PERCENTAGE", progressValue: "25" },
    });

    type Member = { user: { username: string }; progress: unknown };
    const progressOf = (body: { circles: { members: Member[] }[] }) =>
      Object.fromEntries(body.circles[0]?.members.map((m) => [m.user.username, m.progress]) ?? []);

    const asMember = await api("GET", "/me/dashboard", { as: alice });
    expect(asMember.body.circles[0]).toMatchObject({
      viewerRole: "OWNER",
      memberCount: 2,
      nextSchedule: { title: "Kickoff" },
    });
    expect(progressOf(asMember.body)).toEqual({
      alice: null, // まだ Roadmap を始めていない
      bob: { stepIndex: 1, percentage: 25, completedSteps: 1 },
    });

    const asOutsider = await api("GET", "/me/dashboard", { as: carol });
    expect(asOutsider.body.circles[0].viewerRole).toBeNull();
    expect(progressOf(asOutsider.body)).toEqual({ alice: null, bob: null });
  });
});
