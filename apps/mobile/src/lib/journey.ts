import type { Category, Database, Roadmap } from "@/types/domain";
export type JourneyStage =
  | "welcome"
  | "interests"
  | "explore"
  | "today"
  | "circles"
  | "me"
  | "done";
export interface Journey {
  stage: JourneyStage;
  roadmapId?: string;
  needsName?: boolean;
  needsUsername?: boolean;
}
export function firstPaths(roadmaps: Roadmap[], interests: Category[]) {
  return roadmaps
    .filter((r) => r.visibility === "PUBLIC" && r.steps.length > 0)
    .sort(
      (a, b) =>
        Number(interests.includes(b.category)) -
          Number(interests.includes(a.category)) ||
        a.steps.length - b.steps.length,
    )
    .slice(0, 5);
}
export function journeyCircle(d: Database, roadmapId?: string) {
  const r = d.roadmaps.find((r) => r.id === roadmapId);
  return d.circles.find(
    (c) =>
      (c.visibility === "PUBLIC" || c.members.includes(d.profile.name)) &&
      (c.targetType === "Roadmap"
        ? c.targetId === roadmapId
        : !!r?.steps.some((s) => s.bookId === c.targetId)),
  );
}
export function journeyRoute(stage: JourneyStage) {
  if (stage === "welcome" || stage === "interests")
    return "/onboarding" as const;
  if (stage === "explore") return "/explore" as const;
  if (stage === "circles") return "/circles" as const;
  if (stage === "me") return "/me" as const;
  return "/" as const;
}
