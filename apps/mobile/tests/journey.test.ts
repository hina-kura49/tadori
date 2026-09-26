import { expect, it } from "vitest";
import { firstPaths, journeyCircle, journeyRoute } from "../src/lib/journey";
import { createSeed } from "../src/api/seed";
it("prioritizes interests and shorter paths without exposing private paths", () => {
  const d = createSeed();
  const hidden = {
    ...d.roadmaps[0],
    id: "hidden",
    visibility: "PRIVATE" as const,
  };
  const short = {
    ...d.roadmaps[1],
    id: "short",
    steps: d.roadmaps[1].steps.slice(0, 2),
  };
  const found = firstPaths([...d.roadmaps, hidden, short], ["Product"]);
  expect(found[0].id).toBe("short");
  expect(found.some((r) => r.id === "hidden")).toBe(false);
  expect(found.length).toBeLessThanOrEqual(5);
});
it("offers only a related accessible circle, and handles no matching circle", () => {
  const d = createSeed();
  expect(journeyCircle(d, "backend")?.id).toBe("backend-circle");
  d.circles[0].visibility = "INVITE_ONLY";
  expect(journeyCircle(d, "backend")).toBeUndefined();
  expect(journeyCircle(d, "missing")).toBeUndefined();
});
it("resumes the saved actual screen", () => {
  expect(journeyRoute("interests")).toBe("/onboarding");
  expect(journeyRoute("explore")).toBe("/explore");
  expect(journeyRoute("today")).toBe("/");
  expect(journeyRoute("circles")).toBe("/circles");
  expect(journeyRoute("me")).toBe("/me");
});
