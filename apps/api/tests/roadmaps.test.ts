import { describe, expect, it } from "vitest";
import { api, createBook, createRoadmap, createUser } from "./helpers/api";

describe("Roadmap CRUD", () => {
  it("作成すると slug が付き、creator と空の steps を返す", async () => {
    const alice = await createUser("alice");
    const response = await api("POST", "/roadmaps", {
      as: alice,
      json: { title: "Backend Basics", category: "ENGINEERING", difficulty: "BEGINNER" },
    });

    expect(response.status).toBe(201);
    expect(response.body.slug).toMatch(/^backend-basics-[0-9a-f]{8}$/);
    expect(response.body.visibility).toBe("PRIVATE");
    expect(response.body.creator.username).toBe("alice");
    expect(response.body.creator.email).toBeUndefined();
    expect(response.body.steps).toEqual([]);
  });

  it("日本語タイトルでも slug を作れる", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { title: "データベース入門" });
    expect(roadmap.slug).toMatch(/^roadmap-[0-9a-f]{8}$/);
  });

  it("creator は更新できる。slug は変わらない", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice);
    const response = await api("PATCH", `/roadmaps/${roadmap.id}`, {
      as: alice,
      json: { title: "Renamed", estimatedDays: 30 },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ title: "Renamed", estimatedDays: 30, slug: roadmap.slug });
  });

  it("creator 以外は更新・削除できない (403)", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const roadmap = await createRoadmap(alice);

    const update = await api("PATCH", `/roadmaps/${roadmap.id}`, { as: bob, json: { title: "x" } });
    expect(update.status).toBe(403);
    expect(update.body).toEqual({
      code: "FORBIDDEN",
      message: "You are not allowed to edit this roadmap",
    });

    const remove = await api("DELETE", `/roadmaps/${roadmap.id}`, { as: bob });
    expect(remove.status).toBe(403);
  });

  it("creator は削除できる", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { stepCount: 2 });

    expect((await api("DELETE", `/roadmaps/${roadmap.id}`, { as: alice })).status).toBe(204);
    expect((await api("GET", `/roadmaps/${roadmap.slug}`, { as: alice })).status).toBe(404);
  });
});

describe("Roadmap visibility", () => {
  it("一覧には PUBLIC だけが出る", async () => {
    const alice = await createUser("alice");
    await createRoadmap(alice, { visibility: "PUBLIC", title: "Public One" });
    await createRoadmap(alice, { visibility: "UNLISTED", title: "Unlisted One" });
    await createRoadmap(alice, { visibility: "PRIVATE", title: "Private One" });

    const response = await api("GET", "/roadmaps");
    expect(response.body.items.map((item: { title: string }) => item.title)).toEqual([
      "Public One",
    ]);
  });

  it("UNLISTED は slug を知っていれば未ログインでも取得できる", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { visibility: "UNLISTED" });
    expect((await api("GET", `/roadmaps/${roadmap.slug}`)).status).toBe(200);
  });

  it("PRIVATE は creator のみ。他人と未ログインには 404 で存在を隠す", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const roadmap = await createRoadmap(alice, { visibility: "PRIVATE", stepCount: 1 });

    expect((await api("GET", `/roadmaps/${roadmap.slug}`, { as: alice })).status).toBe(200);
    expect((await api("GET", `/roadmaps/${roadmap.slug}`, { as: bob })).status).toBe(404);
    expect((await api("GET", `/roadmaps/${roadmap.slug}`)).status).toBe(404);

    // 他人は PRIVATE Roadmap を開始も編集もできず、存在も分からない
    expect((await api("POST", `/roadmaps/${roadmap.id}/start`, { as: bob })).status).toBe(404);
    const update = await api("PATCH", `/roadmaps/${roadmap.id}`, { as: bob, json: { title: "x" } });
    expect(update.status).toBe(404);
  });

  it("公開 Profile と Book Detail に PRIVATE Roadmap は出ない", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { visibility: "PRIVATE", stepCount: 1 });
    await api("POST", `/roadmaps/${roadmap.id}/start`, { as: alice });

    const profile = await api("GET", "/users/alice");
    expect(profile.status).toBe(200);
    expect(profile.body.createdRoadmaps).toEqual([]);
    expect(profile.body.currentRoadmaps).toEqual([]);
    expect(profile.body.user.email).toBeUndefined();

    const bookId = roadmap.steps[0]?.book.id;
    const book = await api("GET", `/books/${bookId}`);
    expect(book.body.publicRoadmaps).toEqual([]);
  });
});

describe("Roadmap list", () => {
  it("cursor pagination で重複・欠落なく全件たどれる", async () => {
    const alice = await createUser("alice");
    for (let index = 1; index <= 5; index++) {
      await createRoadmap(alice, { title: `Roadmap ${index}` });
    }

    const titles: string[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
      const page = await api("GET", `/roadmaps?limit=2${query}`);
      expect(page.status).toBe(200);
      titles.push(...page.body.items.map((item: { title: string }) => item.title));
      cursor = page.body.nextCursor;
    } while (cursor);

    expect(titles).toEqual(["Roadmap 5", "Roadmap 4", "Roadmap 3", "Roadmap 2", "Roadmap 1"]);
  });

  it("category / creator / q で絞り込める。不正な cursor は 400", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    await createRoadmap(alice, { title: "Alice SQL" });
    await createRoadmap(bob, { title: "Bob HTTP", stepCount: 2 });

    const byCreator = await api("GET", "/roadmaps?creator=bob");
    expect(byCreator.body.items).toHaveLength(1);
    expect(byCreator.body.items[0].stepCount).toBe(2);
    const byQuery = await api("GET", "/roadmaps?q=sql");
    expect(byQuery.body.items[0].title).toBe("Alice SQL");
    const byCategory = await api("GET", "/roadmaps?category=DESIGN");
    expect(byCategory.body.items).toEqual([]);

    const badCursor = await api("GET", "/roadmaps?cursor=not-a-cursor");
    expect(badCursor.status).toBe(400);
    expect(badCursor.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("Roadmap steps", () => {
  it("Step は末尾に追加され、checkpoint は必須", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { stepCount: 2 });
    expect(roadmap.steps.map((step) => step.position)).toEqual([1, 2]);

    const book = await createBook("No checkpoint");
    const response = await api("POST", `/roadmaps/${roadmap.id}/steps`, {
      as: alice,
      json: { bookId: book.id },
    });
    expect(response.status).toBe(400);
  });

  it("存在しない Book は追加できない / creator 以外は追加できない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const roadmap = await createRoadmap(alice);
    const book = await createBook("Book");

    const missing = await api("POST", `/roadmaps/${roadmap.id}/steps`, {
      as: alice,
      json: { bookId: crypto.randomUUID(), checkpoint: "x" },
    });
    expect(missing.body.code).toBe("BOOK_NOT_FOUND");

    const forbidden = await api("POST", `/roadmaps/${roadmap.id}/steps`, {
      as: bob,
      json: { bookId: book.id, checkpoint: "x" },
    });
    expect(forbidden.status).toBe(403);
  });

  it("Step を削除すると後ろの position が詰まる", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { stepCount: 4 });
    const second = roadmap.steps[1];

    const response = await api("DELETE", `/roadmaps/${roadmap.id}/steps/${second?.id}`, {
      as: alice,
    });
    expect(response.status).toBe(200);
    expect(
      response.body.steps.map((step: { position: number; checkpoint: string }) => [
        step.position,
        step.checkpoint,
      ]),
    ).toEqual([
      [1, "Checkpoint 1"],
      [2, "Checkpoint 3"],
      [3, "Checkpoint 4"],
    ]);
  });
});

describe("Roadmap step reorder", () => {
  it("position を入れ替えても UNIQUE 違反にならず、1..n に正規化される", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { stepCount: 3 });
    const [first, second, third] = roadmap.steps;

    const response = await api("PATCH", `/roadmaps/${roadmap.id}/steps/reorder`, {
      as: alice,
      json: {
        steps: [
          { stepId: third?.id, position: 1 },
          { stepId: first?.id, position: 2 },
          { stepId: second?.id, position: 30 },
        ],
      },
    });

    expect(response.status).toBe(200);
    expect(
      response.body.steps.map((step: { id: string; position: number }) => [step.id, step.position]),
    ).toEqual([
      [third?.id, 1],
      [first?.id, 2],
      [second?.id, 3],
    ]);
  });

  it("全 Step を含まない / position が重複する body は 400 で、順序は変わらない", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { stepCount: 3 });
    const [first, second, third] = roadmap.steps;

    const partial = await api("PATCH", `/roadmaps/${roadmap.id}/steps/reorder`, {
      as: alice,
      json: { steps: [{ stepId: first?.id, position: 2 }] },
    });
    expect(partial.status).toBe(400);
    expect(partial.body.code).toBe("INVALID_STEP_ORDER");

    const duplicated = await api("PATCH", `/roadmaps/${roadmap.id}/steps/reorder`, {
      as: alice,
      json: {
        steps: [
          { stepId: first?.id, position: 1 },
          { stepId: second?.id, position: 1 },
          { stepId: third?.id, position: 2 },
        ],
      },
    });
    expect(duplicated.body.code).toBe("INVALID_STEP_ORDER");

    const after = await api("GET", `/roadmaps/${roadmap.slug}`);
    expect(after.body.steps.map((step: { id: string }) => step.id)).toEqual([
      first?.id,
      second?.id,
      third?.id,
    ]);
  });

  it("creator 以外は並べ替えできない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const roadmap = await createRoadmap(alice, { stepCount: 2 });

    const response = await api("PATCH", `/roadmaps/${roadmap.id}/steps/reorder`, {
      as: bob,
      json: { steps: roadmap.steps.map((step, index) => ({ stepId: step.id, position: 2 - index })) },
    });
    expect(response.status).toBe(403);
  });
});
