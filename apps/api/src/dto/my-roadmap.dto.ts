import type {
  ProgressType,
  RoadmapCategory,
  RoadmapDifficulty,
  StepProgressStatus,
  UserRoadmapStatus,
} from "../db/schema";
import type { BookSummaryDto } from "./book.dto";

/** currentStep / nextStep 用。Step の内容と本人の進捗をまとめたもの */
export type MyRoadmapStepDto = {
  stepId: string;
  position: number;
  checkpoint: string;
  book: BookSummaryDto;
  status: StepProgressStatus;
  progressType: ProgressType;
  progressValue: string | null;
};

/** GET /me/roadmaps の 1 件 */
export type MyRoadmapDto = {
  userRoadmapId: string;
  status: UserRoadmapStatus;
  startedAt: string | null;
  completedAt: string | null;
  roadmap: {
    id: string;
    slug: string;
    title: string;
    category: RoadmapCategory;
    difficulty: RoadmapDifficulty;
  };
  // 以下は派生値。DB には保存しない
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  /** いま読んでいる Step。完走済みなら null */
  currentStep: MyRoadmapStepDto | null;
  /** currentStep の次に読む Step。無ければ null */
  nextStep: MyRoadmapStepDto | null;
};
