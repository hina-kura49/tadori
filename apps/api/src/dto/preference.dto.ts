import type { RoadmapCategory } from "../db/schema";

/** onboardedAt (日時) はクライアントに要らないので「終えたかどうか」だけ返す */
export type UserPreferenceDto = {
  interests: RoadmapCategory[];
  primaryRoadmapId: string | null;
  onboarded: boolean;
};
