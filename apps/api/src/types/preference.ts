import type { RoadmapCategory } from "../db/schema";

// 表示上の好み (user_preferences) の型と既定値。

export type UserPreferenceValues = {
  interests: RoadmapCategory[];
  primaryRoadmapId: string | null;
  onboardedAt: Date | null;
};

/** user_preferences に行が無い User はこの値として扱う (DB の default と揃えること) */
export const DEFAULT_USER_PREFERENCES: UserPreferenceValues = {
  interests: [],
  primaryRoadmapId: null,
  onboardedAt: null,
};
