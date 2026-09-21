import { describe, expect, it } from "vitest";
import { createSeed } from "../src/api/seed";
import { normalizeProgress, stepState, summary } from "../src/lib/progress";
import {
  circleSchema,
  roadmapSchema,
  reminderSchema,
} from "../src/features/forms";
import { Enrollment } from "../src/types/domain";
const roadmap = createSeed().roadmaps[0];
describe("learning path transitions", () => {
  it("starts at first unfinished checkpoint, including out-of-order completion", () => {
    const e: Enrollment = {
      roadmapId: roadmap.id,
      startedAt: "2026-09-21",
      progress: {
        "s-web": normalizeProgress(100),
        "s-sql": normalizeProgress(100),
        "s-db": normalizeProgress(42),
      },
    };
    expect(summary(roadmap, e)).toMatchObject({
      done: 2,
      index: 1,
      percentage: 61,
      complete: false,
    });
    expect(stepState(roadmap, 1, e)).toBe("CURRENT");
    expect(stepState(roadmap, 2, e)).toBe("COMPLETED");
    expect(stepState(roadmap, 3, e)).toBe("LOCKED");
  });
  it("reaches the end only when every checkpoint is completed", () => {
    const e: Enrollment = {
      roadmapId: roadmap.id,
      startedAt: "",
      progress: Object.fromEntries(
        roadmap.steps.map((s) => [s.id, normalizeProgress(100)]),
      ),
    };
    expect(summary(roadmap, e)).toMatchObject({
      complete: true,
      index: -1,
      done: 4,
      percentage: 100,
    });
  });
  it("rejects invalid updates and allows starting at 0%", () => {
    for (const value of [-1, 101, NaN, Infinity])
      expect(() => normalizeProgress(value)).toThrow();
    expect(normalizeProgress(0)).toEqual({ percentage: 0, status: "READING" });
  });
  it("marks steps available before enrollment", () => {
    expect(stepState(roadmap, 3)).toBe("AVAILABLE");
  });
});
describe("creation and reminders", () => {
  it("requires an actionable checkpoint on every step", () => {
    expect(
      roadmapSchema.safeParse({
        ...roadmap,
        steps: [{ ...roadmap.steps[0], checkpoint: " " }],
      }).success,
    ).toBe(false);
    expect(roadmapSchema.safeParse({ ...roadmap, steps: [] }).success).toBe(
      false,
    );
    expect(roadmapSchema.safeParse(roadmap).success).toBe(true);
  });
  it("rejects impossible dates, inverted ranges and meetings outside the circle", () => {
    const circle = createSeed().circles[0];
    expect(circleSchema.safeParse(circle).success).toBe(true);
    expect(
      circleSchema.safeParse({ ...circle, startDate: "2026-02-30" }).success,
    ).toBe(false);
    expect(
      circleSchema.safeParse({ ...circle, endDate: "2026-08-01" }).success,
    ).toBe(false);
    expect(
      circleSchema.safeParse({ ...circle, meeting: "2027-01-01T20:00" })
        .success,
    ).toBe(false);
    expect(circleSchema.safeParse({ ...circle, maxMembers: 1 }).success).toBe(
      false,
    );
  });
  it("requires a real time and at least one weekday when enabled", () => {
    expect(
      reminderSchema.safeParse({ study: true, time: "20:00", weekdays: [2, 4] })
        .success,
    ).toBe(true);
    expect(
      reminderSchema.safeParse({ study: true, time: "24:00", weekdays: [2] })
        .success,
    ).toBe(false);
    expect(
      reminderSchema.safeParse({ study: true, time: "20:00", weekdays: [] })
        .success,
    ).toBe(false);
  });
});
