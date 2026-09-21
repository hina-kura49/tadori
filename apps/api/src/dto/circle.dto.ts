import type { CircleMemberRole, CircleTargetType, CircleVisibility } from "../db/schema";
import type {
  CircleMemberWithUserRow,
  CircleScheduleRow,
  CircleSummaryRow,
} from "../repositories/circle.repository";
import type { BookSummaryDto } from "./book.dto";
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

/** GET /circles/:id */
export type CircleDetailDto = CircleSummaryDto & {
  target: CircleTargetDto;
  members: CircleMemberDto[];
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
