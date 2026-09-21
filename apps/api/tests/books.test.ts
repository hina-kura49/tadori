import { describe, expect, it } from "vitest";
import { api, createRoadmap, createUser } from "./helpers/api";

describe("Books", () => {
  it("作成は認証必須。ISBN のハイフンは取り除かれ、重複は 409", async () => {
    const alice = await createUser("alice");
    const json = { title: "SQLアンチパターン", author: "Bill Karwin", isbn13: "978-4-87311-589-4" };

    expect((await api("POST", "/books", { json })).status).toBe(401);

    const created = await api("POST", "/books", { as: alice, json });
    expect(created.status).toBe(201);
    expect(created.body.isbn13).toBe("9784873115894");

    const duplicated = await api("POST", "/books", { as: alice, json });
    expect(duplicated.status).toBe(409);
    expect(duplicated.body.code).toBe("BOOK_ALREADY_EXISTS");
  });

  it("isbn13 が無い Book は何冊でも作れる", async () => {
    const alice = await createUser("alice");
    for (const title of ["A", "B"]) {
      const response = await api("POST", "/books", { as: alice, json: { title, author: "x" } });
      expect(response.status).toBe(201);
    }
  });

  it("title / author / isbn13 で検索でき、LIKE のワイルドカードは無効化される", async () => {
    const alice = await createUser("alice");
    await api("POST", "/books", {
      as: alice,
      json: { title: "Clean Architecture", author: "Robert C. Martin", isbn13: "9784048930659" },
    });
    await api("POST", "/books", { as: alice, json: { title: "INSPIRED", author: "Marty Cagan" } });

    const titles = async (q: string) =>
      (await api("GET", `/books?q=${encodeURIComponent(q)}`)).body.items.map(
        (item: { title: string }) => item.title,
      );

    expect(await titles("clean")).toEqual(["Clean Architecture"]);
    expect(await titles("cagan")).toEqual(["INSPIRED"]);
    expect(await titles("978-4048")).toEqual(["Clean Architecture"]);
    expect(await titles("%")).toEqual([]);
  });

  it("Book Detail は PUBLIC Roadmap を含む / 不正な id は 400", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { stepCount: 1 });

    const detail = await api("GET", `/books/${roadmap.steps[0]?.book.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.publicRoadmaps.map((item: { id: string }) => item.id)).toEqual([roadmap.id]);

    expect((await api("GET", "/books/not-a-uuid")).status).toBe(400);
    expect((await api("GET", `/books/${crypto.randomUUID()}`)).body.code).toBe("BOOK_NOT_FOUND");
  });
});
