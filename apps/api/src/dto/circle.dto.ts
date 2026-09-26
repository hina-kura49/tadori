import type { CircleMemberRole, CircleTargetType, CircleVisibility } from "../db/schema";
import type {
  CircleMemberWithUserRow,
  CircleScheduleRow,
  CircleSummaryRow,
} from "../repositories/circle.repository";
import type { BookSummaryDto } from "./book.dto";
import type { RoadmapStepDto } from "./roadmap.dto";
import { toUserSummaryDto, type UserSummaryDto } from "./user.dto";

/** 一覧用 */
export type CircleSummaryDto = {
  id: string;
  name: string;
  description: string | null;
  targetType: CircleTargetType;
  bookId: string | null;
  roadmapId: string | null;
  visibility: CircleVisibility;
  startDate: string | null;
  targetEndDate: string | null;
  maxMembers: number;
  memberCount: number;
  createdAt: string;
};

export type CircleMemberDto = {
  role: CircleMemberRole;
  joinedAt: string;
  user: UserSummaryDto;
};

export type CircleScheduleDto = {
  id: string;
  title: string;
  scheduledAt: string;
  description: string | null;
};

/** Circle の対象。targetType に応じて片方だけが入る */
export type CircleTargetDto =
  | { type: "BOOK"; book: BookSummaryDto }
  | { type: "ROADMAP"; roadmap: { id: string; slug: string; title: string } };

/** GET /circles, GET /me/circles の 1 件。カードに「何を読む Circle か」を出せるよう対象の概要を付ける */
export type CircleListItemDto = CircleSummaryDto & { target: CircleTargetDto };

/** 詳細では Roadmap の Step も返す (メンバーの現在地を道のりとして描くため) */
export type CircleDetailTargetDto =
  | { type: "BOOK"; book: BookSummaryDto }
  | {
      type: "ROADMAP";
      roadmap: { id: string; slug: string; title: string; steps: RoadmapStepDto[] };
    };

/** Circle の対象 (Roadmap / Book) に対するメンバーの現在地 */
export type CircleMemberProgressDto = {
  /** 0 始まり。Roadmap Circle では「いま何冊目か」、Book Circle では常に 0 */
  stepIndex: number;
  /** その Step (本) の進捗。0〜100 */
  percentage: number;
  /** 読み終えた Step の数。Book Circle では読み終えていれば 1 */
  completedSteps: number;
};

export type CircleDetailMemberDto = CircleMemberDto & {
  /** 自分が参加している Circle でだけ入る。対象をまだ始めていないメンバーは null */
  progress: CircleMemberProgressDto | null;
};

/** GET /circles/:id */
export type CircleDetailDto = CircleSummaryDto & {
  target: CircleDetailTargetDto;
  members: CircleDetailMemberDto[];
  schedules: CircleScheduleDto[];
  /** リクエストした User から見た状態 */
  viewer: { role: CircleMemberRole | null; isInvited: boolean };
};

export function toCircleSummaryDto(row: CircleSummaryRow): CircleSummaryDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetType: row.targetType,
    bookId: row.bookId,
    roadmapId: row.roadmapId,
    visibility: row.visibility,
    startDate: row.startDate,
    targetEndDate: row.targetEndDate,
    maxMembers: row.maxMembers,
    memberCount: row.memberCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toCircleMemberDto(row: CircleMemberWithUserRow): CircleMemberDto {
  return {
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
    user: toUserSummaryDto(row.user),
  };
}

export function toCircleScheduleDto(row: CircleScheduleRow): CircleScheduleDto {
  return {
    id: row.id,
    title: row.title,
    scheduledAt: row.scheduledAt.toISOString(),
    description: row.description,
  };
}
