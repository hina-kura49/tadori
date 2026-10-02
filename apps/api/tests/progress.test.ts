import { describe, expect, it, vi } from "vitest";
import { expoPushClient } from "../src/lib/expo-push-client";
import { deriveProgress } from "../src/services/progress.service";
import { api, createRoadmap, createUser, registerDevice } from "./helpers/api";

async function startedRoadmap(stepCount: number) {
  const alice = await createUser("alice");
  const roadmap = await createRoadmap(alice, { stepCount });
  const started = await api("POST", `/roadmaps/${roadmap.id}/start`, { as: alice });
  return { alice, roadmap, started };
}

describe("Roadmap start", () => {
  it("UserRoadmap を作り、最初の Step だけ READING にする", async () => {
    const { alice, roadmap, started } = await startedRoadmap(3);

    expect(started.status).toBe(201);
    expect(started.body).toMatchObject({
      status: "IN_PROGRESS",
      totalSteps: 3,
      completedSteps: 0,
      progressPercentage: 0,
      currentStep: { stepId: roadmap.steps[0]?.id, status: "READING" },
      nextStep: { stepId: roadmap.steps[1]?.id, status: "NOT_STARTED" },
    });

    const detail = await api("GET", `/roadmaps/${roadmap.slug}`, { as: alice });
    expect(
      detail.body.userProgress.steps.map((step: { status: string }) => step.status),
    ).toEqual(["READING", "NOT_STARTED", "NOT_STARTED"]);
  });

  it("二重に開始できない / Step が無い Roadmap は開始できない", async () => {
    const { alice, roadmap } = await startedRoadmap(1);
    const again = await api("POST", `/roadmaps/${roadmap.id}/start`, { as: alice });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("ROADMAP_ALREADY_STARTED");

    const empty = await createRoadmap(alice, { stepCount: 0 });
    const response = await api("POST", `/roadmaps/${empty.id}/start`, { as: alice });
    expect(response.body.code).toBe("ROADMAP_HAS_NO_STEPS");
  });

  it("未ログインの閲覧者には userProgress を返さない", async () => {
    const { roadmap } = await startedRoadmap(1);
    const detail = await api("GET", `/roadmaps/${roadmap.slug}`);
    expect(detail.body.userProgress).toBeNull();
  });
});

describe("Progress update", () => {
  it("進捗 (PERCENTAGE) を記録できる", async () => {
    const { alice, roadmap, started } = await startedRoadmap(2);
    const response = await api(
      "PATCH",
      `/me/roadmaps/${started.body.userRoadmapId}/steps/${roadmap.steps[0]?.id}`,
      { as: alice, json: { status: "READING", progressType: "PERCENTAGE", progressValue: "42" } },
    );

    expect(response.status).toBe(200);
    expect(response.body.currentStep).toMatchObject({
      progressType: "PERCENTAGE",
      progressValue: "42",
    });
  });

  it("progressType と progressValue の組み合わせを検証する", async () => {
    const { alice, roadmap, started } = await startedRoadmap(1);
    const url = `/me/roadmaps/${started.body.userRoadmapId}/steps/${roadmap.steps[0]?.id}`;

    for (const json of [
      { progressType: "PERCENTAGE", progressValue: "101" },
      { progressType: "PAGE", progressValue: "abc" },
      { progressType: "CHAPTER" },
      { progressType: "NONE", progressValue: "1" },
      { progressValue: "10" },
      {},
    ]) {
      const response = await api("PATCH", url, { as: alice, json });
      expect(response.status, JSON.stringify(json)).toBe(400);
    }

    const chapter = await api("PATCH", url, {
      as: alice,
      json: { progressType: "CHAPTER", progressValue: "Chapter 4" },
    });
    expect(chapter.status).toBe(200);
  });

  it("Step を COMPLETED にすると次の Step が READING になり、通知が飛ぶ", async () => {
    const { alice, roadmap, started } = await startedRoadmap(3);
    await registerDevice(alice, "alice-phone");

    const response = await api(
      "PATCH",
      `/me/roadmaps/${started.body.userRoadmapId}/steps/${roadmap.steps[0]?.id}`,
      { as: alice, json: { status: "COMPLETED" } },
    );

    expect(response.body).toMatchObject({
      status: "IN_PROGRESS",
      completedSteps: 1,
      progressPercentage: 33,
      currentStep: { stepId: roadmap.steps[1]?.id, status: "READING" },
      nextStep: { stepId: roadmap.steps[2]?.id },
    });

    const send = vi.mocked(expoPushClient.send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0][0]).toMatchObject({
      to: "ExponentPushToken[alice-phone]",
      data: { type: "NEXT_STEP_AVAILABLE", url: `readtree://roadmaps/${roadmap.slug}` },
    });
  });

  it("他人の UserRoadmap は更新できない (404 で存在を隠す)", async () => {
    const { roadmap, started } = await startedRoadmap(1);
    const bob = await createUser("bob");

    const response = await api(
      "PATCH",
      `/me/roadmaps/${started.body.userRoadmapId}/steps/${roadmap.steps[0]?.id}`,
      { as: bob, json: { status: "COMPLETED" } },
    );
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("USER_ROADMAP_NOT_FOUND");

    const pause = await api("PATCH", `/me/roadmaps/${started.body.userRoadmapId}`, {
      as: bob,
      json: { status: "PAUSED" },
    });
    expect(pause.status).toBe(404);
  });

  it("別の Roadmap の Step は指定できない", async () => {
    const { alice, started } = await startedRoadmap(1);
    const other = await createRoadmap(alice, { stepCount: 1 });

    const response = await api(
      "PATCH",
      `/me/roadmaps/${started.body.userRoadmapId}/steps/${other.steps[0]?.id}`,
      { as: alice, json: { status: "COMPLETED" } },
    );
    expect(response.body.code).toBe("ROADMAP_STEP_NOT_FOUND");
  });

  it("一時停止と再開ができ、status で絞り込める", async () => {
    const { alice, started } = await startedRoadmap(2);
    const paused = await api("PATCH", `/me/roadmaps/${started.body.userRoadmapId}`, {
      as: alice,
      json: { status: "PAUSED" },
    });
    expect(paused.body.status).toBe("PAUSED");

    expect((await api("GET", "/me/roadmaps?status=PAUSED", { as: alice })).body.items).toHaveLength(1);
    expect(
      (await api("GET", "/me/roadmaps?status=IN_PROGRESS", { as: alice })).body.items,
    ).toHaveLength(0);
  });
});

describe("Roadmap completion", () => {
  it("最後の Step を完了すると UserRoadmap が COMPLETED になる", async () => {
    const { alice, roadmap, started } = await startedRoadmap(2);
    await registerDevice(alice, "alice-phone");
    const base = `/me/roadmaps/${started.body.userRoadmapId}/steps`;

    await api("PATCH", `${base}/${roadmap.steps[0]?.id}`, { as: alice, json: { status: "COMPLETED" } });
    const done = await api("PATCH", `${base}/${roadmap.steps[1]?.id}`, {
      as: alice,
      json: { status: "COMPLETED" },
    });

    expect(done.body).toMatchObject({
      status: "COMPLETED",
      progressPercentage: 100,
      currentStep: null,
      nextStep: null,
    });
    expect(done.body.completedAt).not.toBeNull();

    const lastCall = vi.mocked(expoPushClient.send).mock.calls.at(-1);
    expect(lastCall?.[0][0]?.data).toMatchObject({ type: "ROADMAP_COMPLETED" });

    const profile = await api("GET", "/users/alice");
    expect(profile.body.stats).toEqual({ booksCompleted: 2, roadmapsCompleted: 1 });
    expect(profile.body.completedRoadmaps).toHaveLength(1);
  });

  it("完了した Step を READING に戻すと IN_PROGRESS に戻る", async () => {
    const { alice, roadmap, started } = await startedRoadmap(1);
    const url = `/me/roadmaps/${started.body.userRoadmapId}/steps/${roadmap.steps[0]?.id}`;

    await api("PATCH", url, { as: alice, json: { status: "COMPLETED" } });
    const reopened = await api("PATCH", url, { as: alice, json: { status: "READING" } });

    expect(reopened.body).toMatchObject({ status: "IN_PROGRESS", completedAt: null });
  });

  it("progressNotificationEnabled が false なら通知しない", async () => {
    const { alice, roadmap, started } = await startedRoadmap(1);
    await registerDevice(alice, "alice-phone");
    await api("PATCH", "/me/notification-preferences", {
      as: alice,
      json: { progressNotificationEnabled: false },
    });

    await api(
      "PATCH",
      `/me/roadmaps/${started.body.userRoadmapId}/steps/${roadmap.steps[0]?.id}`,
      { as: alice, json: { status: "COMPLETED" } },
    );
    expect(vi.mocked(expoPushClient.send)).not.toHaveBeenCalled();
  });

  it("Expo への送信が失敗しても進捗更新は成功する", async () => {
    const { alice, roadmap, started } = await startedRoadmap(1);
    await registerDevice(alice, "alice-phone");
    vi.mocked(expoPushClient.send).mockRejectedValue(new Error("expo is down"));

    const response = await api(
      "PATCH",
      `/me/roadmaps/${started.body.userRoadmapId}/steps/${roadmap.steps[0]?.id}`,
      { as: alice, json: { status: "COMPLETED" } },
    );
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("COMPLETED");
  });
});

describe("deriveProgress", () => {
  const step = (position: number, status: "NOT_STARTED" | "READING" | "COMPLETED") => ({
    userRoadmapId: "ur",
    stepId: `step-${position}`,
    position,
    checkpoint: "c",
    book: { id: "b", title: "t", author: "a", coverImageUrl: null },
    status,
    progressType: "NONE" as const,
    progressValue: null,
    startedAt: null,
    completedAt: null,
  });

  it("READING の Step を current、その後ろの未完了 Step を next にする", () => {
    const derived = deriveProgress([
      step(1, "COMPLETED"),
      step(2, "READING"),
      step(3, "COMPLETED"),
      step(4, "NOT_STARTED"),
    ]);
    expect(derived.progressPercentage).toBe(50);
    expect(derived.currentStep?.position).toBe(2);
    expect(derived.nextStep?.position).toBe(4);
  });

  it("Step が 0 件でも 0% を返す", () => {
    expect(deriveProgress([])).toMatchObject({ progressPercentage: 0, currentStep: null });
  });
});
