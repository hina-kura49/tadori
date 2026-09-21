import type { NotificationPreferenceDto } from "../dto/notification.dto";
import * as notificationPreferenceRepository from "../repositories/notification-preference.repository";
import type { UpdateNotificationPreferenceInput } from "../schemas/me.schema";
import type { AuthUser } from "../types/app";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferenceValues,
} from "../types/notification";

// 責務分担:
// - 学習リマインダー (studyReminder*) の Local Notification はモバイル端末がスケジュールする
// - Backend は設定値を保存するだけ。機種変更・再インストール時にここから復元する

function toValues(row: NotificationPreferenceValues): NotificationPreferenceDto {
  return {
    studyReminderEnabled: row.studyReminderEnabled,
    studyReminderTime: row.studyReminderTime,
    studyReminderTimezone: row.studyReminderTimezone,
    circleReminderEnabled: row.circleReminderEnabled,
    progressNotificationEnabled: row.progressNotificationEnabled,
    inviteNotificationEnabled: row.inviteNotificationEnabled,
  };
}

/** 未保存の User には既定値を返す (GET では行を作らない) */
export async function getPreferences(user: AuthUser): Promise<NotificationPreferenceDto> {
  const row = await notificationPreferenceRepository.findByUserId(user.id);
  return toValues(row ?? DEFAULT_NOTIFICATION_PREFERENCES);
}

export async function updatePreferences(
  user: AuthUser,
  input: UpdateNotificationPreferenceInput,
): Promise<NotificationPreferenceDto> {
  const current = await getPreferences(user);
  const row = await notificationPreferenceRepository.upsert(user.id, { ...current, ...input });
  return toValues(row);
}
