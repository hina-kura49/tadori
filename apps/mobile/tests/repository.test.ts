import { beforeEach, expect, it, vi } from "vitest";
const saved = new Map<string, string>();
vi.mock("@/lib/storage", () => ({
  storage: {
    get: async (k: string) => saved.get(k) ?? null,
    set: async (k: string, v: string) => {
      saved.set(k, v);
    },
  },
  session: { getToken: async () => null },
}));
import { repository } from "../src/api/repository";
beforeEach(() => saved.clear());
it("serializes concurrent enrollments and persists progress without duplicates", async () => {
  await Promise.all([
    repository.enroll("backend"),
    repository.enroll("backend"),
    repository.enroll("product"),
  ]);
  await repository.progress("backend", "s-web", 100);
  const d = await repository.getDashboard();
  expect(d.enrollments).toHaveLength(2);
  expect(d.enrollments[0].progress["s-web"].status).toBe("COMPLETED");
});
it("rejects progress from a different roadmap", async () => {
  await repository.enroll("backend");
  await expect(
    repository.progress("backend", "s-inspired", 30),
  ).rejects.toThrow();
});
it("joins a circle only once", async () => {
  await repository.saveProfile({
    name: "Test",
    username: "test",
    bio: "",
    interests: ["Engineering"],
    onboarded: true,
  });
  const circle = (await repository.getDashboard()).circles[0];
  await repository.joinCircle(circle.id);
  await repository.joinCircle(circle.id);
  expect(
    (await repository.getDashboard()).circles[0].members.filter(
      (m) => m === "Test",
    ),
  ).toHaveLength(1);
});

it("registers a book without fetching any external cover", async () => {
  const id = await repository.createBook({
    title: "自分の学びの一冊",
    author: "My author",
  });
  const book = (await repository.getDashboard()).books.find((b) => b.id === id);
  expect(book?.title).toBe("自分の学びの一冊");
  expect(book?.coverUri).toBeUndefined();
  expect(
    (await repository.getDashboard()).books.every((b) => !b.coverUri),
  ).toBe(true);
});

it("rejects full circles and invite-only circles", async () => {
  const d = await repository.getDashboard();
  d.profile = {
    name: "New member",
    username: "newmember",
    bio: "",
    interests: [],
    onboarded: true,
  };
  d.circles[0].maxMembers = d.circles[0].members.length;
  d.circles[1].visibility = "INVITE_ONLY";
  saved.set("tadori.database.v1", JSON.stringify(d));
  await expect(repository.joinCircle(d.circles[0].id)).rejects.toThrow("満員");
  await expect(repository.joinCircle(d.circles[1].id)).rejects.toThrow("招待");
});
