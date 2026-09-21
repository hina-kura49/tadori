import type { CircleMemberRole, UserRoadmapStatus } from "../db/schema";
import type { BookSummaryDto } from "./book.dto";
import type { CircleMemberDto, CircleScheduleDto, CircleSummaryDto } from "./circle.dto";
import type { NotificationPreferenceDto } from "./notification.dto";
import type { RoadmapStepDto, RoadmapSummaryDto, StepProgressDto } from "./roadmap.dto";
import type { CurrentUserDto } from "./user.dto";

// GET /me/dashboard — アプリが起動時と更新後に取得する「自分に関係するデータ一式」。
// 中身は他の API と同じ DTO の組み合わせで、Dashboard 専用の新しい概念は持ち込まない。

export type DashboardRoadmapDto = RoadmapSummaryDto & { steps: RoadmapStepDto[] };

export type DashboardUserRoadmapDto = {
  userRoadmapId: string;
  roadmapId: string;
  status: UserRoadmapStatus;
  startedAt: string | null;
  completedAt: string | null;
  steps: StepProgressDto[];
};

/** Circle の対象 (Roadmap / Book) に対するメンバーの現在地 */
export type CircleMemberProgressDto = {
  /** 0 始まり。Roadmap Circle では「いま何冊目か」、Book Circle では常に 0 */
  stepIndex: number;
  /** その Step (本) の進捗。0〜100 */
  percentage: number;
};

export type DashboardCircleMemberDto = CircleMemberDto & {
  /** 自分が参加している Circle でだけ入る。対象をまだ始めていないメンバーは null */
  progress: CircleMemberProgressDto | null;
};

export type DashboardCircleDto = CircleSummaryDto & {
  members: DashboardCircleMemberDto[];
  nextSchedule: CircleScheduleDto | null;
  viewerRole: CircleMemberRole | null;
};

export type DashboardDto = {
  user: CurrentUserDto;
  /** PUBLIC の新着 + 自分が作成 / 学習中 / 参加 Circle の対象 */
  roadmaps: DashboardRoadmapDto[];
  userRoadmaps: DashboardUserRoadmapDto[];
  /** 上の Roadmap・Circle が参照する Book + 新着 (Roadmap 作成時の選択肢) */
  books: BookSummaryDto[];
  /** PUBLIC の新着 + 自分が参加している Circle */
  circles: DashboardCircleDto[];
  notificationPreferences: NotificationPreferenceDto;
};
