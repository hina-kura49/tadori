import { z } from "zod";
import { DEVICE_PLATFORMS } from "../db/schema";
import { nullableTrimmedString, trimmedString, usernameSchema } from "./common.schema";

export const updateMeSchema = z
  .object({
    name: trimmedString(80),
    username: usernameSchema,
    bio: nullableTrimmedString(500),
    avatarUrl: z.url().max(2000).nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const registerDeviceSchema = z.object({
  // 形式: ExponentPushToken[xxxx] または ExpoPushToken[xxxx]
  expoPushToken: z
    .string()
    .max(200)
    .regex(/^Expo(nent)?PushToken\[[^\]\s]+\]$/, "expoPushToken is not a valid Expo push token"),
  platform: z.enum(DEVICE_PLATFORMS),
  deviceId: trimmedString(200),
});

export const deviceParamSchema = z.object({ deviceId: trimmedString(200) });

const isValidTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const updateNotificationPreferenceSchema = z
  .object({
    studyReminderEnabled: z.boolean(),
    studyReminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be HH:mm (24h)"),
    studyReminderTimezone: z.string().max(64).refine(isValidTimezone, "must be an IANA timezone"),
    circleReminderEnabled: z.boolean(),
    progressNotificationEnabled: z.boolean(),
    inviteNotificationEnabled: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;
