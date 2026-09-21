import type { MyRoadmapDto } from "./my-roadmap.dto";
import type { RoadmapSummaryDto } from "./roadmap.dto";
import type { UserSummaryDto } from "./user.dto";

/** Profile に載せる学習中 / 完走済み Roadmap。Step の詳細までは返さない */
export type ProfileRoadmapDto = Pick<
  MyRoadmapDto,
  "roadmap" | "status" | "progressPercentage" | "startedAt" | "completedAt"
>;

/**
 * GET /users/:username — 公開 Learning Profile 専用の DTO。
 * email などの非公開情報と、PUBLIC 以外の Roadmap は含めない。
 */
export type LearningProfileDto = {
  user: UserSummaryDto & { bio: string | null; createdAt: string };
  stats: { booksCompleted: number; roadmapsCompleted: number };
  currentRoadmaps: ProfileRoadmapDto[];
  completedRoadmaps: ProfileRoadmapDto[];
  createdRoadmaps: RoadmapSummaryDto[];
};
