import { type ExpoPushMessage, expoPushClient } from "../lib/expo-push-client";
import { logger } from "../lib/logger";
import * as circleRepository from "../repositories/circle.repository";
import * as deviceTokenRepository from "../repositories/device-token.repository";
import * as notificationPreferenceRepository from "../repositories/notification-preference.repository";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  PREFERENCE_KEY_BY_TYPE,
  type PushPayload,
} from "../types/notification";

// Push Notification の送信はすべてこのファイルに集約する。
//
//   [イベント関数]  notifyRoadmapCompleted / notifyCircleJoined ...   <- 他の Service が呼ぶ
//        |
//   [宛先の解決]    sendPushToUser / sendPushToCircle  (通知設定で絞り込み -> token 取得)
//        |
//   [送信]          sendPushNotification               (Expo Push API。ここだけが外部通信)
//
// ルール:
// - Route や他の Service から expoPushClient を直接呼ばない
// - 通知の失敗で本処理 (進捗更新など) を失敗させない。このファイルの関数は throw しない
// - token や通知本文はログに出さない

const EXPO_CHUNK_SIZE = 100;
/** 開催の何分前から Meeting Reminder の対象にするか */
const MEETING_REMINDER_WINDOW_MINUTES = 60;

// ---------------------------------------------------------------------------
// 送信
// ---------------------------------------------------------------------------

/** token の配列へ送信する。Expo が「端末は登録解除済み」と返した token は無効化する */
export async function sendPushNotification(tokens: string[], payload: PushPayload): Promise<void> {
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: { type: payload.type, ...payload.data },
    sound: "default",
  }));

  for (let start = 0; start < messages.length; start += EXPO_CHUNK_SIZE) {
    const chunk = messages.slice(start, start + EXPO_CHUNK_SIZE);
    try {
      const tickets = await expoPushClient.send(chunk);
      const unregisteredTokens = chunk
        .filter((_, index) => {
          const ticket = tickets[index];
          return ticket?.status === "error" && ticket.details?.error === "DeviceNotRegistered";
        })
        .map((message) => message.to);
      await deviceTokenRepository.disableTokens(unregisteredTokens);
    } catch (error) {
      logger.error("Failed to send push notifications", {
        type: payload.type,
        messageCount: chunk.length,
        error,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 宛先の解決
// ---------------------------------------------------------------------------

/** 通知設定 (行が無ければ既定値) を見て、この種類の通知を受け取る User だけを残す */
async function filterUsersByPreference(
  userIds: string[],
  type: PushPayload["type"],
): Promise<string[]> {
  const preferenceKey = PREFERENCE_KEY_BY_TYPE[type];
  const rows = await notificationPreferenceRepository.findByUserIds(userIds);
  const rowByUserId = new Map(rows.map((row) => [row.userId, row]));

  return userIds.filter(
    (userId) => (rowByUserId.get(userId) ?? DEFAULT_NOTIFICATION_PREFERENCES)[preferenceKey],
  );
}

async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  try {
    const recipients = await filterUsersByPreference([...new Set(userIds)], payload.type);
    const tokens = await deviceTokenRepository.listEnabledTokensByUserIds(recipients);
    await sendPushNotification(tokens, payload);
  } catch (error) {
    logger.error("Failed to resolve push recipients", { type: payload.type, error });
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  await sendPushToUsers([userId], payload);
}

export async function sendPushToCircle(
  circleId: string,
  payload: PushPayload,
  options: { excludeUserIds?: string[] } = {},
): Promise<void> {
  try {
    const memberIds = await circleRepository.listMemberUserIds(circleId);
    const excluded = new Set(options.excludeUserIds ?? []);
    await sendPushToUsers(
      memberIds.filter((userId) => !excluded.has(userId)),
      payload,
    );
  } catch (error) {
    logger.error("Failed to resolve circle members for push", { type: payload.type, error });
  }
}

// ---------------------------------------------------------------------------
// イベント関数 (他の Service はここだけを呼ぶ)
// ---------------------------------------------------------------------------

export async function notifyRoadmapCompleted(params: {
  userId: string;
  roadmapSlug: string;
  roadmapTitle: string;
}): Promise<void> {
  await sendPushToUser(params.userId, {
    type: "ROADMAP_COMPLETED",
    title: "Roadmap を完走しました",
    body: `「${params.roadmapTitle}」のすべての Checkpoint に到達しました`,
    data: { roadmapSlug: params.roadmapSlug },
  });
}

export async function notifyNextStepAvailable(params: {
  userId: string;
  roadmapSlug: string;
  nextBookTitle: string;
}): Promise<void> {
  await sendPushToUser(params.userId, {
    type: "NEXT_STEP_AVAILABLE",
    title: "次の Step に進めます",
    body: `次の本は「${params.nextBookTitle}」です`,
    data: { roadmapSlug: params.roadmapSlug },
  });
}

export async function notifyCircleInvite(params: {
  invitedUserId: string;
  inviterName: string;
  circleId: string;
  circleName: string;
}): Promise<void> {
  await sendPushToUser(params.invitedUserId, {
    type: "CIRCLE_INVITE",
    title: "Circle に招待されました",
    body: `${params.inviterName} さんから「${params.circleName}」への招待が届きました`,
    data: { circleId: params.circleId },
  });
}

/** 参加した本人以外のメンバーへ知らせる */
export async function notifyCircleJoined(params: {
  joinedUserId: string;
  joinedUserName: string;
  circleId: string;
  circleName: string;
}): Promise<void> {
  await sendPushToCircle(
    params.circleId,
    {
      type: "CIRCLE_JOIN",
      title: "新しいメンバーが参加しました",
      body: `${params.joinedUserName} さんが「${params.circleName}」に参加しました`,
      data: { circleId: params.circleId },
    },
    { excludeUserIds: [params.joinedUserId] },
  );
}

/**
 * まもなく開催される Circle Schedule のリマインドを送る。
 * src/index.ts のタイマーから 1 分ごとに呼ばれる (V1 では Message Queue を使わない)。
 * 送信した Schedule 数を返す。
 */
export async function sendDueCircleMeetingReminders(now: Date = new Date()): Promise<number> {
  try {
    const until = new Date(now.getTime() + MEETING_REMINDER_WINDOW_MINUTES * 60_000);
    const schedules = await circleRepository.claimSchedulesDueForReminder(now, until);

    for (const schedule of schedules) {
      await sendPushToCircle(schedule.circleId, {
        type: "CIRCLE_MEETING_REMINDER",
        title: "まもなく Circle の予定が始まります",
        body: schedule.title,
        data: { circleId: schedule.circleId, scheduleId: schedule.id },
      });
    }
    return schedules.length;
  } catch (error) {
    logger.error("Failed to send circle meeting reminders", { error });
    return 0;
  }
}
