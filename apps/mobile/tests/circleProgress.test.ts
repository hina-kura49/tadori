import { expect, it } from "vitest";
import { createSeed } from "../src/api/seed";
import { circlePositions } from "../src/lib/circleProgress";
it("uses explicit member progress and never invents progress for a new member", () => {
  const d = createSeed();
  const c = d.circles[0];
  c.members.push("New member");
  const positions = circlePositions(c, d);
  expect(positions.filter((p) => p.position?.step === 1)).toHaveLength(3);
  expect(
    positions.find((p) => p.name === "New member")?.position,
  ).toBeUndefined();
});
it("reflects the signed-in member’s own path, including completion", () => {
  const d = createSeed();
  d.profile.name = "Learner";
  const c = d.circles[0];
  c.members.push("Learner");
  const r = d.roadmaps[0];
  d.enrollments = [
    {
      roadmapId: r.id,
      startedAt: "",
      progress: {
        "s-web": { percentage: 100, status: "COMPLETED" },
        "s-db": { percentage: 42, status: "READING" },
      },
    },
  ];
  expect(
    circlePositions(c, d).find((p) => p.name === "Learner")?.position,
  ).toEqual({ step: 1, percentage: 42 });
  d.enrollments[0].progress = Object.fromEntries(
    r.steps.map((s) => [s.id, { percentage: 100, status: "COMPLETED" }]),
  );
  expect(
    circlePositions(c, d).find((p) => p.name === "Learner")?.position,
  ).toEqual({ step: 3, percentage: 100 });
});
