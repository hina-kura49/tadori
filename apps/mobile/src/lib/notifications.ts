import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router, Href } from "expo-router";
import { NotificationSettings } from "@/types/domain";
import { APP_SCHEME, notificationPath } from "./links";
import { repository } from "@/api/repository";
if (Platform.OS !== "web")
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
export function observeNotifications() {
  if (Platform.OS === "web") return () => {};
  let active = true;
  let lastId = "";
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (
      !active ||
      !response ||
      lastId === response.notification.request.identifier
    )
      return;
    lastId = response.notification.request.identifier;
    const path = notificationPath(
      response.notification.request.content.data?.url,
    );
    if (path) router.push(path as Href);
  };
  void Notifications.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => {
    active = false;
    sub.remove();
  };
}
export async function scheduleReminder(
  settings: NotificationSettings,
  bookTitle?: string,
  slug?: string,
) {
  if (Platform.OS === "web") {
    if (settings.study)
      throw new Error("学習リマインダーはiOS / Androidアプリで設定できます。");
    return;
  }
  if (settings.study) {
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync("study", {
        name: "Study reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    const permissions = await Notifications.requestPermissionsAsync();
    if (!permissions.granted)
      throw new Error(
        "通知が許可されていません。端末の設定から通知を許可してください。",
      );
  }
  const old = (await Notifications.getAllScheduledNotificationsAsync()).filter(
    (n) => n.identifier.startsWith("tadori-study-"),
  );
  const [hour, minute] = settings.time.split(":").map(Number);
  // Schedule replacement IDs before removing the old schedules. On failure, roll back only the new ones.
  const fresh: string[] = [];
  try {
    if (settings.study) {
      for (const weekday of settings.weekdays) {
        const id = await Notifications.scheduleNotificationAsync({
          identifier: `tadori-study-${Date.now()}-${weekday}`,
          content: {
            title: "今日も、一歩ずつ。",
            body: bookTitle
              ? `『${bookTitle}』の続きを読みませんか？`
              : "あなたの学びの道を、少し進めませんか？",
            data: { url: slug ? `${APP_SCHEME}://roadmaps/${slug}` : undefined },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
            channelId: "study",
          },
        });
        fresh.push(id);
      }
    }
  } catch (error) {
    await Promise.all(
      fresh.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
    );
    throw error;
  }
  await Promise.all(
    old.map((n) =>
      Notifications.cancelScheduledNotificationAsync(n.identifier),
    ),
  );
}
export async function registerPush() {
  if (Platform.OS === "web") return false;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return false;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("circles", {
      name: "Circle notifications",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) throw new Error("通知の許可が必要です。");
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await repository.registerPush(token.data);
  return true;
}
