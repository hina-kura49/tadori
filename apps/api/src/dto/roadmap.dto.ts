import type {
  ProgressType,
  RoadmapCategory,
  RoadmapDifficulty,
  RoadmapVisibility,
  StepProgressStatus,
  UserRoadmapStatus,
} from "../db/schema";
import type { RoadmapStepRow, RoadmapSummaryRow } from "../repositories/roadmap.repository";
import { type BookSummaryDto, toBookSummaryDto } from "./book.dto";
import { toUserSummaryDto, type UserSummaryDto } from "./user.dto";

/** 一覧・埋め込み用 */
export type RoadmapSummaryDto = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: RoadmapCategory;
  difficulty: RoadmapDifficulty;
  estimatedDays: number | null;
  visibility: RoadmapVisibility;
  stepCount: number;
  /** この Roadmap を完走した User 数 */
  completedUserCount: number;
  creator: UserSummaryDto;
  createdAt: string;
  updatedAt: string;
};

export type RoadmapStepDto = {
  id: string;
  position: number;
  description: string | null;
  checkpoint: string;
  estimatedDays: number | null;
  book: BookSummaryDto;
};

export type StepProgressDto = {
  stepId: string;
  status: StepProgressStatus;
  progressType: ProgressType;
  progressValue: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

/** ログイン中の User がその Roadmap を開始している場合の進捗 */
export type UserProgressDto = {
  userRoadmapId: string;
  status: UserRoadmapStatus;
  startedAt: string | null;
  completedAt: string | null;
  progressPercentage: number;
  steps: StepProgressDto[];
};

/** GET /roadmaps/:slug */
export type RoadmapDetailDto = RoadmapSummaryDto & {
  steps: RoadmapStepDto[];
  userProgress: UserProgressDto | null;
};

export function toRoadmapSummaryDto(row: RoadmapSummaryRow): RoadmapSummaryDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty,
    estimatedDays: row.estimatedDays,
    visibility: row.visibility,
    stepCount: row.stepCount,
    completedUserCount: row.completedUserCount,
    creator: toUserSummaryDto(row.creator),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toRoadmapStepDto(row: RoadmapStepRow): RoadmapStepDto {
  return {
    id: row.id,
    position: row.position,
    description: row.description,
    checkpoint: row.checkpoint,
    estimatedDays: row.estimatedDays,
    book: toBookSummaryDto(row.book),
  };
}
