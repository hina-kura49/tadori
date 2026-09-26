import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../src/db/client";
import { userPreferences } from "../src/db/schema";
import { api, createRoadmap, createUser } from "./helpers/api";

describe("User preferences", () => {
  it("未保存なら既定値を返し、行は作らない", async () => {
    const alice = await createUser("alice");
    const response = await api("GET", "/me/preferences", { as: alice });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ interests: [], primaryRoadmapId: null, onboarded: false });
    expect(await db.select().from(userPreferences)).toHaveLength(0);
  });

  it("部分更新でき、他の User には影響しない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");

    const updated = await api("PATCH", "/me/preferences", {
      as: alice,
      json: { interests: ["ENGINEERING", "DESIGN", "ENGINEERING"], onboarded: true },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({
      interests: ["ENGINEERING", "DESIGN"],
      primaryRoadmapId: null,
      onboarded: true,
    });

    const again = await api("PATCH", "/me/preferences", { as: alice, json: { interests: [] } });
    expect(again.body).toMatchObject({ interests: [], onboarded: true });

    const bobs = await api("GET", "/me/preferences", { as: bob });
    expect(bobs.body.onboarded).toBe(false);
  });

  it("onboarded を true にし直しても、最初に終えた日時は変わらない", async () => {
    const alice = await createUser("alice");
    await api("PATCH", "/me/preferences", { as: alice, json: { onboarded: true } });
    const [first] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, alice.id));

    await api("PATCH", "/me/preferences", { as: alice, json: { onboarded: true } });
    const [second] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, alice.id));
    expect(second?.onboardedAt).toEqual(first?.onboardedAt);

    const reset = await api("PATCH", "/me/preferences", { as: alice, json: { onboarded: false } });
    expect(reset.body.onboarded).toBe(false);
  });

  it("primaryRoadmapId は開始済みの Roadmap だけ。Roadmap が消えると null に戻る", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { stepCount: 1 });

    const notStarted = await api("PATCH", "/me/preferences", {
      as: alice,
      json: { primaryRoadmapId: roadmap.id },
    });
    expect(notStarted.status).toBe(404);
    expect(notStarted.body.code).toBe("USER_ROADMAP_NOT_FOUND");

    await api("POST", `/roadmaps/${roadmap.id}/start`, { as: alice });
    const selected = await api("PATCH", "/me/preferences", {
      as: alice,
      json: { primaryRoadmapId: roadmap.id },
    });
    expect(selected.body.primaryRoadmapId).toBe(roadmap.id);

    await api("DELETE", `/roadmaps/${roadmap.id}`, { as: alice });
    const afterDelete = await api("GET", "/me/preferences", { as: alice });
    expect(afterDelete.body.primaryRoadmapId).toBeNull();
  });

  it("不正な値は 400 / 未ログインは 401", async () => {
    const alice = await createUser("alice");
    for (const json of [{ interests: ["COOKING"] }, { primaryRoadmapId: "not-a-uuid" }, {}]) {
      const response = await api("PATCH", "/me/preferences", { as: alice, json });
      expect(response.status, JSON.stringify(json)).toBe(400);
    }
    expect((await api("GET", "/me/preferences")).status).toBe(401);
  });
});
