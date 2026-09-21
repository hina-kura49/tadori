import { Circle, Database } from "@/types/domain";
import { summary } from "./progress";
export function circlePositions(circle: Circle, db: Database) {
  return circle.members.map((name) => {
    let position = circle.memberProgress?.[name];
    if (name === db.profile.name) {
      if (circle.targetType === "Roadmap") {
        const roadmap = db.roadmaps.find((r) => r.id === circle.targetId);
        const enrollment = db.enrollments.find(
          (e) => e.roadmapId === circle.targetId,
        );
        if (roadmap && enrollment) {
          const s = summary(roadmap, enrollment);
          position = {
            step: s.complete ? roadmap.steps.length - 1 : s.index,
            percentage: s.complete
              ? 100
              : (enrollment.progress[s.current!.id]?.percentage ?? 0),
          };
        }
      } else {
        const related = db.enrollments.flatMap((e) => {
          const r = db.roadmaps.find((r) => r.id === e.roadmapId);
          return (
            r?.steps
              .filter((s) => s.bookId === circle.targetId)
              .flatMap((s) => (e.progress[s.id] ? [e.progress[s.id]] : [])) ??
            []
          );
        });
        if (related.length)
          position = {
            step: 0,
            percentage: Math.max(...related.map((p) => p.percentage)),
          };
      }
    }
    return { name, position };
  });
}
