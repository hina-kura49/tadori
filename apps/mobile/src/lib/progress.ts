import { Enrollment, Roadmap, StepState } from "@/types/domain";
export function summary(roadmap: Roadmap, enrollment?: Enrollment) {
  const done = roadmap.steps.filter(
    (s) => enrollment?.progress[s.id]?.status === "COMPLETED",
  ).length;
  const index = roadmap.steps.findIndex(
    (s) => enrollment?.progress[s.id]?.status !== "COMPLETED",
  );
  const percentage = Math.round(
    roadmap.steps.reduce(
      (n, s) => n + (enrollment?.progress[s.id]?.percentage ?? 0),
      0,
    ) / Math.max(roadmap.steps.length, 1),
  );
  return {
    done,
    index,
    percentage,
    complete: done === roadmap.steps.length,
    current: roadmap.steps[index],
  };
}
export function stepState(
  roadmap: Roadmap,
  index: number,
  enrollment?: Enrollment,
): StepState {
  if (enrollment?.progress[roadmap.steps[index].id]?.status === "COMPLETED")
    return "COMPLETED";
  if (!enrollment) return "AVAILABLE";
  return summary(roadmap, enrollment).index === index ? "CURRENT" : "LOCKED";
}
export function normalizeProgress(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 100)
    throw new Error("進捗は0〜100で入力してください。");
  const percentage = Math.round(value);
  return {
    percentage,
    status: percentage === 100 ? ("COMPLETED" as const) : ("READING" as const),
  };
}
