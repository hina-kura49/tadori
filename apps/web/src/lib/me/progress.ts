import type { DashboardRoadmap, DashboardUserRoadmap, StepProgress } from "@/hooks/me/useDashboard";

/** その本の進み具合 (0〜100)。API の stepPercentage と同じ考え方 */
export function stepPercentage(progress?: StepProgress): number {
  if (!progress) return 0;
  if (progress.status === "COMPLETED") return 100;
  if (progress.progressType !== "PERCENTAGE" || progress.progressValue === null) return 0;
  const value = Number(progress.progressValue);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

/** ロードマップの現在地: 最初の未完了の Step と、完了した冊数 */
export function summarize(roadmap: DashboardRoadmap, userRoadmap: DashboardUserRoadmap) {
  const steps = roadmap.steps.toSorted((a, b) => a.position - b.position);
  const progressOf = (stepId: string) => userRoadmap.steps.find((p) => p.stepId === stepId);
  const done = steps.filter((step) => progressOf(step.id)?.status === "COMPLETED").length;
  const index = steps.findIndex((step) => progressOf(step.id)?.status !== "COMPLETED");
  const current = index === -1 ? undefined : steps[index];
  return {
    steps,
    done,
    index,
    current,
    next: index === -1 ? undefined : steps[index + 1],
    complete: steps.length > 0 && done === steps.length,
    progressOf,
  };
}
