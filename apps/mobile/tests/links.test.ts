import { expect, it, vi } from "vitest";
vi.mock("expo-linking", () => ({ createURL: (p: string) => `readtree://${p}` }));
import { notificationPath, shareUrl } from "../src/lib/links";
const web = "https://readtree.example";
it("routes only supported Readtree notifications, never arbitrary URLs", () => {
  expect(notificationPath("readtree://roadmaps/backend-engineering", web)).toBe(
    "/roadmaps/backend-engineering",
  );
  expect(notificationPath("https://readtree.example/r/backend-engineering", web)).toBe(
    "/r/backend-engineering",
  );
  expect(notificationPath("/circles/test-id", web)).toBe("/circles/test-id");
  for (const bad of [
    "https://evil.test/circles/1",
    "javascript:alert(1)",
    "//evil.test",
    "/circles/../settings",
    "https://readtree.example.evil.test/r/foo",
    "tadori://roadmaps/old-scheme",
    null,
  ])
    expect(notificationPath(bad, web)).toBeNull();
});
it("shares the web URL when it is configured, otherwise the app link", () => {
  expect(shareUrl("r", "backend-engineering", web)).toBe("https://readtree.example/r/backend-engineering");
  expect(shareUrl("r", "backend-engineering", undefined)).toBe("readtree://r/backend-engineering");
});
