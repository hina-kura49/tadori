import { expect, it, vi } from "vitest";
vi.mock("expo-linking", () => ({ createURL: (p: string) => `tadori://${p}` }));
import { notificationPath } from "../src/lib/links";
it("routes only supported Tadori notifications, never arbitrary URLs", () => {
  expect(notificationPath("tadori://roadmaps/backend-engineering")).toBe(
    "/roadmaps/backend-engineering",
  );
  expect(notificationPath("https://tadori.app/r/backend-engineering")).toBe(
    "/r/backend-engineering",
  );
  expect(notificationPath("/circles/test-id")).toBe("/circles/test-id");
  for (const bad of [
    "https://evil.test/circles/1",
    "javascript:alert(1)",
    "//evil.test",
    "/circles/../settings",
    "https://tadori.app.evil.test/r/foo",
    null,
  ])
    expect(notificationPath(bad)).toBeNull();
});
