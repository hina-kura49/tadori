import { describe, expect, it } from "vitest";
import type { DashboardRoadmap, DashboardUserRoadmap, StepProgress } from "@/hooks/me/useDashboard";
import { stepPercentage, summarize } from "@/lib/me/progress";

const progress = (stepId: string, patch: Partial<StepProgress>) =>
  ({ stepId, status: "READING", progressType: "PERCENTAGE", progressValue: null, ...patch }) as StepProgress;

const roadmap = {
  steps: [
    { id: "c", position: 3 },
    { id: "a", position: 1 },
    { id: "b", position: 2 },
  ],
} as unknown as DashboardRoadmap;

describe("stepPercentage", () => {
  it("記録が無ければ 0、読み終えたら 100", () => {
    expect(stepPercentage(undefined)).toBe(0);
    expect(stepPercentage(progress("a", { status: "COMPLETED" }))).toBe(100);
  });

  it("割合は 0〜100 に収める", () => {
    expect(stepPercentage(progress("a", { progressValue: "40" }))).toBe(40);
    expect(stepPercentage(progress("a", { progressValue: "130" }))).toBe(100);
    expect(stepPercentage(progress("a", { progressType: "PAGE", progressValue: "40" }))).toBe(0);
  });
});

describe("summarize", () => {
  it("position 順に並べ、最初の未完了を現在地にする", () => {
    const user = { steps: [progress("a", { status: "COMPLETED" })] } as unknown as DashboardUserRoadmap;
    const result = summarize(roadmap, user);
    expect(result.steps.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(result.done).toBe(1);
    expect(result.current?.id).toBe("b");
    expect(result.next?.id).toBe("c");
    expect(result.complete).toBe(false);
  });

  it("全部読み終えたら complete", () => {
    const user = {
      steps: ["a", "b", "c"].map((id) => progress(id, { status: "COMPLETED" })),
    } as unknown as DashboardUserRoadmap;
    const result = summarize(roadmap, user);
    expect(result.complete).toBe(true);
    expect(result.current).toBeUndefined();
  });
});
