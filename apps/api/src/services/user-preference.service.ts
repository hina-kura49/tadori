import type { UserPreferenceDto } from "../dto/preference.dto";
import { notFound } from "../lib/errors";
import * as userPreferenceRepository from "../repositories/user-preference.repository";
import * as userRoadmapRepository from "../repositories/user-roadmap.repository";
import type { UpdatePreferenceInput } from "../schemas/me.schema";
import type { AuthUser } from "../types/app";
import { DEFAULT_USER_PREFERENCES, type UserPreferenceValues } from "../types/preference";

function toDto(values: UserPreferenceValues): UserPreferenceDto {
  return {
    interests: values.interests,
    primaryRoadmapId: values.primaryRoadmapId,
    onboarded: values.onboardedAt !== null,
  };
}

async function findValues(user: AuthUser): Promise<UserPreferenceValues> {
  const row = await userPreferenceRepository.findByUserId(user.id);
  return row ?? DEFAULT_USER_PREFERENCES;
}

/** 未保存の User には既定値を返す (GET では行を作らない) */
export async function getPreferences(user: AuthUser): Promise<UserPreferenceDto> {
  return toDto(await findValues(user));
}

export async function updatePreferences(
  user: AuthUser,
  input: UpdatePreferenceInput,
): Promise<UserPreferenceDto> {
  // 「メインの Roadmap」に選べるのは、本人が学習を始めたものだけ
  if (input.primaryRoadmapId) {
    const started = await userRoadmapRepository.findUserRoadmapByUserAndRoadmap(
      user.id,
      input.primaryRoadmapId,
    );
    if (!started) throw notFound("USER_ROADMAP_NOT_FOUND", "User roadmap not found");
  }

  const current = await findValues(user);
  const next: UserPreferenceValues = {
    interests: input.interests ?? current.interests,
    primaryRoadmapId:
      input.primaryRoadmapId === undefined ? current.primaryRoadmapId : input.primaryRoadmapId,
    // 最初に終えた日時を残す。false を送ると未完了に戻る (やり直し用)
    onboardedAt:
      input.onboarded === undefined
        ? current.onboardedAt
        : input.onboarded
          ? (current.onboardedAt ?? new Date())
          : null,
  };
  const row = await userPreferenceRepository.upsert(user.id, next);
  return toDto(row);
}
