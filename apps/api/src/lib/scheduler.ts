import * as notificationService from "../services/notification.service";
import { logger } from "./logger";

// プロセス内の簡易スケジューラ。V1 では Message Queue / 外部 cron を使わない。
// 複数インスタンスで動かしても、Schedule の確保が原子的なので二重送信はしない
// (circle.repository.ts の claimSchedulesDueForReminder を参照)。

const INTERVAL_MS = 60_000;

export function startScheduler(): () => void {
  const timer = setInterval(() => {
    void notificationService.sendDueCircleMeetingReminders().then((count) => {
      if (count > 0) logger.info("Sent circle meeting reminders", { scheduleCount: count });
    });
  }, INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
