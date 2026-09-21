// Push 通知に関する型と既定値。

/** 通知の種類。モバイル側は data.type を見て遷移先を決める */
export type PushNotificationType =
  | "CIRCLE_MEETING_REMINDER"
  | "CIRCLE_INVITE"
  | "CIRCLE_JOIN"
  | "ROADMAP_COMPLETED"
  | "NEXT_STEP_AVAILABLE";

export type PushPayload = {
  type: PushNotificationType;
  title: string;
  body: string;
  /** `url` はタップ時の遷移先 (deep link)。ほかは ID など。個人情報や secret は入れない */
  data?: Record<string, string>;
};

export type NotificationPreferenceValues = {
  studyReminderEnabled: boolean;
  studyReminderTime: string;
  studyReminderTimezone: string;
  circleReminderEnabled: boolean;
  progressNotificationEnabled: boolean;
  inviteNotificationEnabled: boolean;
};

/** notification_preferences に行が無い User はこの値として扱う (DB の default と揃えること) */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceValues = {
  studyReminderEnabled: false,
  studyReminderTime: "20:00",
  studyReminderTimezone: "Asia/Tokyo",
  circleReminderEnabled: true,
  progressNotificationEnabled: true,
  inviteNotificationEnabled: true,
};

type BooleanPreferenceKey = {
  [Key in keyof NotificationPreferenceValues]: NotificationPreferenceValues[Key] extends boolean
    ? Key
    : never;
}[keyof NotificationPreferenceValues];

/** どの通知がどの設定で ON/OFF されるか */
export const PREFERENCE_KEY_BY_TYPE: Record<PushNotificationType, BooleanPreferenceKey> = {
  CIRCLE_MEETING_REMINDER: "circleReminderEnabled",
  CIRCLE_JOIN: "circleReminderEnabled",
  CIRCLE_INVITE: "inviteNotificationEnabled",
  ROADMAP_COMPLETED: "progressNotificationEnabled",
  NEXT_STEP_AVAILABLE: "progressNotificationEnabled",
};
