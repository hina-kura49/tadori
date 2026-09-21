// apps/api の Response 型のうち、アプリが使う部分の写し。
// 正は apps/api/src/dto/*.dto.ts。API 側を変えたらここも合わせる。
// (apps/api の型を直接 import しないのは、向こうの型が drizzle / hono に依存していて
//  このパッケージの tsc では解決できないため)

export type ApiCategory =
  | "ENGINEERING"
  | "PRODUCT"
  | "BUSINESS"
  | "MARKETING"
  | "MANAGEMENT"
  | "FINANCE"
  | "DESIGN"
  | "OTHER";
export type ApiDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type ApiStepStatus = "NOT_STARTED" | "READING" | "COMPLETED";

export type ApiUserSummary = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};
export type ApiCurrentUser = ApiUserSummary & {
  email: string;
  bio: string | null;
  usernameConfirmed: boolean;
};
export type ApiBookSummary = {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
};
export type ApiRoadmapStep = {
  id: string;
  position: number;
  description: string | null;
  checkpoint: string;
  estimatedDays: number | null;
  book: ApiBookSummary;
};
export type ApiRoadmap = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: ApiCategory;
  difficulty: ApiDifficulty;
  estimatedDays: number | null;
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  completedUserCount: number;
  creator: ApiUserSummary;
  steps: ApiRoadmapStep[];
};
export type ApiStepProgress = {
  stepId: string;
  status: ApiStepStatus;
  progressType: "NONE" | "PERCENTAGE" | "PAGE" | "CHAPTER";
  progressValue: string | null;
};
export type ApiUserRoadmap = {
  userRoadmapId: string;
  roadmapId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED";
  startedAt: string | null;
  steps: ApiStepProgress[];
};
export type ApiCircle = {
  id: string;
  name: string;
  targetType: "BOOK" | "ROADMAP";
  bookId: string | null;
  roadmapId: string | null;
  visibility: "PUBLIC" | "INVITE_ONLY";
  startDate: string | null;
  targetEndDate: string | null;
  maxMembers: number;
  members: {
    role: "OWNER" | "MEMBER";
    user: ApiUserSummary;
    progress: { stepIndex: number; percentage: number } | null;
  }[];
  nextSchedule: { id: string; title: string; scheduledAt: string } | null;
};
export type ApiNotificationPreferences = {
  studyReminderEnabled: boolean;
  studyReminderTime: string;
  studyReminderTimezone: string;
  circleReminderEnabled: boolean;
  progressNotificationEnabled: boolean;
  inviteNotificationEnabled: boolean;
};
export type ApiDashboard = {
  user: ApiCurrentUser;
  roadmaps: ApiRoadmap[];
  userRoadmaps: ApiUserRoadmap[];
  books: ApiBookSummary[];
  circles: ApiCircle[];
  notificationPreferences: ApiNotificationPreferences;
};
