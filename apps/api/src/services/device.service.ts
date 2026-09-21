import { db } from "../db/client";
import type { DeviceDto } from "../dto/notification.dto";
import { conflict, notFound } from "../lib/errors";
import * as deviceTokenRepository from "../repositories/device-token.repository";
import type { RegisterDeviceInput } from "../schemas/me.schema";
import type { AuthUser } from "../types/app";

/**
 * POST /me/devices — (userId, deviceId) で upsert する。
 *
 * expoPushToken は全体で UNIQUE。他の User が「有効な状態」で持っている token は登録できない
 * (他人の端末宛ての通知を横取り・停止させないため)。
 * ただし同じ端末で A がログアウト (= token 無効化) した後に B がログインするのは正当なので、
 * 無効化済みの token は引き継げる。
 */
export async function registerDevice(
  user: AuthUser,
  input: RegisterDeviceInput,
): Promise<DeviceDto> {
  const device = await db.transaction(async (tx) => {
    const existing = await deviceTokenRepository.findByExpoPushToken(input.expoPushToken, tx);
    if (existing && existing.userId !== user.id) {
      if (existing.enabled) {
        throw conflict("PUSH_TOKEN_IN_USE", "This push token is registered to another account");
      }
      await deviceTokenRepository.deleteById(existing.id, tx);
    }

    await deviceTokenRepository.deleteOwnTokenOnOtherDevices(
      { userId: user.id, expoPushToken: input.expoPushToken, deviceId: input.deviceId },
      tx,
    );
    return deviceTokenRepository.upsertForDevice({ userId: user.id, ...input }, tx);
  });

  return {
    deviceId: device.deviceId,
    platform: device.platform,
    enabled: device.enabled,
    lastUsedAt: device.lastUsedAt?.toISOString() ?? null,
  };
}

/** DELETE /me/devices/:deviceId — 行は残して無効化する。ログアウト時にモバイルから呼ぶ */
export async function disableDevice(user: AuthUser, deviceId: string): Promise<void> {
  const disabledCount = await deviceTokenRepository.disableByDeviceId(user.id, deviceId);
  if (disabledCount === 0) throw notFound("DEVICE_NOT_FOUND", "Device not found");
}
