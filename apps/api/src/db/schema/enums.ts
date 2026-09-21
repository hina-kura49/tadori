import { pgEnum } from "drizzle-orm/pg-core";

// Enum の値はここが唯一の定義元。
// Zod schema (src/schemas) と DTO もこの配列から型を作る。

export const ROADMAP_DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export const ROADMAP_VISIBILITIES = ["PUBLIC", "UNLISTED", "PRIVATE"] as const;
export const ROADMAP_CATEGORIES = [
  "ENGINEERING",
  "PRODUCT",
  "BUSINESS",
  "MARKETING",
  "MANAGEMENT",
  "FINANCE",
  "DESIGN",
  "OTHER",
] as const;
export const USER_ROADMAP_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "PAUSED", "COMPLETED"] as const;
export const STEP_PROGRESS_STATUSES = ["NOT_STARTED", "READING", "COMPLETED"] as const;
export const PROGRESS_TYPES = ["NONE", "PERCENTAGE", "PAGE", "CHAPTER"] as const;
export const CIRCLE_TARGET_TYPES = ["BOOK", "ROADMAP"] as const;
export const CIRCLE_VISIBILITIES = ["PUBLIC", "INVITE_ONLY"] as const;
export const CIRCLE_MEMBER_ROLES = ["OWNER", "MEMBER"] as const;
export const DEVICE_PLATFORMS = ["IOS", "ANDROID"] as const;

export type RoadmapDifficulty = (typeof ROADMAP_DIFFICULTIES)[number];
export type RoadmapVisibility = (typeof ROADMAP_VISIBILITIES)[number];
export type RoadmapCategory = (typeof ROADMAP_CATEGORIES)[number];
export type UserRoadmapStatus = (typeof USER_ROADMAP_STATUSES)[number];
export type StepProgressStatus = (typeof STEP_PROGRESS_STATUSES)[number];
export type ProgressType = (typeof PROGRESS_TYPES)[number];
export type CircleTargetType = (typeof CIRCLE_TARGET_TYPES)[number];
export type CircleVisibility = (typeof CIRCLE_VISIBILITIES)[number];
export type CircleMemberRole = (typeof CIRCLE_MEMBER_ROLES)[number];
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export const roadmapDifficultyEnum = pgEnum("roadmap_difficulty", ROADMAP_DIFFICULTIES);
export const roadmapVisibilityEnum = pgEnum("roadmap_visibility", ROADMAP_VISIBILITIES);
export const roadmapCategoryEnum = pgEnum("roadmap_category", ROADMAP_CATEGORIES);
export const userRoadmapStatusEnum = pgEnum("user_roadmap_status", USER_ROADMAP_STATUSES);
export const stepProgressStatusEnum = pgEnum("step_progress_status", STEP_PROGRESS_STATUSES);
export const progressTypeEnum = pgEnum("progress_type", PROGRESS_TYPES);
export const circleTargetTypeEnum = pgEnum("circle_target_type", CIRCLE_TARGET_TYPES);
export const circleVisibilityEnum = pgEnum("circle_visibility", CIRCLE_VISIBILITIES);
export const circleMemberRoleEnum = pgEnum("circle_member_role", CIRCLE_MEMBER_ROLES);
export const devicePlatformEnum = pgEnum("device_platform", DEVICE_PLATFORMS);
