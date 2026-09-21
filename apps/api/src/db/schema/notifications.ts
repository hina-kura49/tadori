import { boolean, index, pgTable, text, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, id, timestamptz, updatedAt } from "./columns";
import { devicePlatformEnum } from "./enums";

// 1 User が複数端末を持てる。expoPushToken は全体で UNIQUE。
export const devicePushTokens = pgTable(
  "device_push_tokens",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expoPushToken: text("expo_push_token").notNull().unique(),
    platform: devicePlatformEnum("platform").notNull(),
    deviceId: text("device_id").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    lastUsedAt: timestamptz("last_used_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("device_push_tokens_user_id_device_id_unique").on(table.userId, table.deviceId),
    index("device_push_tokens_user_id_idx").on(table.userId),
  ],
);

// 行が無い User は「既定値」として扱う (notification-preference.service.ts 参照)
export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  studyReminderEnabled: boolean("study_reminder_enabled").notNull().default(false),
  studyReminderTime: text("study_reminder_time").notNull().default("20:00"), // "HH:mm"
  studyReminderTimezone: text("study_reminder_timezone").notNull().default("Asia/Tokyo"), // IANA
  circleReminderEnabled: boolean("circle_reminder_enabled").notNull().default(true),
  progressNotificationEnabled: boolean("progress_notification_enabled").notNull().default(true),
  inviteNotificationEnabled: boolean("invite_notification_enabled").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
