import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { createApiClient } from "../src/client";
import { createRoadmap, createUser } from "./helpers/api";

// Hono RPC クライアント (src/client.ts) が、型・実行の両面でサーバーと噛み合っていることを確認する。
// fetch を app.request に差し替えているので、ネットワークは使わない。
describe("Hono RPC client", () => {
  it("型付きで一覧・詳細・認証付き API を呼べる", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { stepCount: 2 });

    const client = createApiClient("http://localhost", {
      fetch: (input: string | URL | Request, init?: RequestInit) => app.request(input, init),
      headers: { cookie: alice.cookie },
    });

    const list = await client.roadmaps.index.$get({ query: { category: "ENGINEERING", limit: "10" } });
    const page = await list.json();
    // page.items は RoadmapSummaryDto[] として推論される
    expect(page.items.map((item) => item.slug)).toEqual([roadmap.slug]);

    const started = await client.roadmaps[":id"].start.$post({ param: { id: roadmap.id } });
    const myRoadmap = await started.json();
    expect(myRoadmap.currentStep?.checkpoint).toBe("Checkpoint 1");

    const updated = await client.me.roadmaps[":userRoadmapId"].steps[":stepId"].$patch({
      param: { userRoadmapId: myRoadmap.userRoadmapId, stepId: roadmap.steps[0]?.id ?? "" },
      json: { status: "COMPLETED" },
    });
    expect((await updated.json()).progressPercentage).toBe(50);
  });
});
