import type { DevicePlatform } from "../db/schema";
import type { NotificationPreferenceValues } from "../types/notification";

/** expoPushToken そのものは返さない (登録した端末自身が知っていれば十分) */
export type DeviceDto = {
  deviceId: string;
  platform: DevicePlatform;
  enabled: boolean;
  lastUsedAt: string | null;
};

export type NotificationPreferenceDto = NotificationPreferenceValues;
