import {
  BookInput,
  CircleInput,
  Database,
  NotificationSettings,
  Profile,
  RoadmapInput,
} from "@/types/domain";
import { normalizeProgress } from "@/lib/progress";
import { ApiError, request } from "./client";
import { readLocal, updateLocal } from "./localState";
import {
  parseDuration,
  toApiCategory,
  toApiDifficulty,
  toDatabase,
} from "./mappers";
import { ApiDashboard } from "./remoteTypes";

// 実 API (apps/api) を使う repository。Mock 版 (repository.ts) と同じ関数を持つ。
// 対応表と設計判断は apps/api/docs/mobile-integration.md を参照。

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});
const isRemoteUrl = (uri?: string) => !!uri && uri.startsWith("https://");

// 直近の dashboard。更新系 API に必要な ID (userId / userRoadmapId) を引くために保持する
let last: ApiDashboard | undefined;
async function dashboard(): Promise<ApiDashboard> {
  last = await request<ApiDashboard>("/me/dashboard");
  return last;
}
const current = async () => last ?? (await dashboard());

export const remote = {
  getDashboard: async (): Promise<Database> => {
    const api = await dashboard();
    return toDatabase(api, await readLocal(api.user.id));
  },

  saveProfile: async (profile: Profile): Promise<Profile> => {
    const { user } = await current();
    await request(
      "/me",
      json("PATCH", {
        name: profile.name,
        username: profile.username,
        bio: profile.bio.trim() ? profile.bio : null,
        ...(isRemoteUrl(profile.avatarUri)
          ? { avatarUrl: profile.avatarUri }
          : {}),
      }),
    );
    await updateLocal(user.id, (state) => {
      state.interests = profile.interests;
      // 端末内の画像は API に送れないので、この端末でだけ表示する
      state.avatarUri = isRemoteUrl(profile.avatarUri)
        ? undefined
        : profile.avatarUri;
    });
    return profile;
  },

  createBook: async (input: BookInput): Promise<string> => {
    const { user } = await current();
    const book = await request<{ id: string }>(
      "/books",
      json("POST", {
        title: input.title,
        author: input.author,
        ...(isRemoteUrl(input.coverUri)
          ? { coverImageUrl: input.coverUri }
          : {}),
      }),
    );
    if (input.coverUri && !isRemoteUrl(input.coverUri))
      await updateLocal(user.id, (state) => {
        state.bookCovers[book.id] = input.coverUri!;
      });
    return book.id;
  },

  enroll: async (roadmapId: string): Promise<void> => {
    try {
      await request(`/roadmaps/${roadmapId}/start`, json("POST"));
    } catch (error) {
      // Mock と同じく、すでに開始済みなら何もしない
      if (error instanceof ApiError && error.code === "ROADMAP_ALREADY_STARTED")
        return;
      throw error;
    }
  },

  setPrimary: async (roadmapId: string): Promise<void> => {
    const { user } = await current();
    await updateLocal(user.id, (state) => {
      state.primaryRoadmapId = roadmapId;
    });
  },

  progress: async (
    roadmapId: string,
    stepId: string,
    value: number,
  ): Promise<void> => {
    const { percentage, status } = normalizeProgress(value);
    const find = (api: ApiDashboard) =>
      api.userRoadmaps.find((u) => u.roadmapId === roadmapId);
    const userRoadmap = find(await current()) ?? find(await dashboard());
    if (!userRoadmap)
      throw new Error("まずRoadmapを学習に追加してください。");
    await request(
      `/me/roadmaps/${userRoadmap.userRoadmapId}/steps/${stepId}`,
      json("PATCH", {
        status,
        progressType: "PERCENTAGE",
        progressValue: String(percentage),
      }),
    );
  },

  /** Roadmap を作り、Step を順に追加する。途中で失敗したら Roadmap ごと取り消す */
  createRoadmap: async (input: RoadmapInput): Promise<string> => {
    const roadmap = await request<{ id: string; slug: string }>(
      "/roadmaps",
      json("POST", {
        title: input.title,
        description: input.description.trim() ? input.description : null,
        category: toApiCategory(input.category),
        difficulty: toApiDifficulty(input.difficulty),
        estimatedDays: parseDuration(input.duration),
        visibility: input.visibility,
      }),
    );
    try {
      for (const step of input.steps)
        await request(
          `/roadmaps/${roadmap.id}/steps`,
          json("POST", {
            bookId: step.bookId,
            checkpoint: step.checkpoint,
            description: step.why.trim() ? step.why : null,
            estimatedDays: parseDuration(step.duration),
          }),
        );
    } catch (error) {
      await request(`/roadmaps/${roadmap.id}`, json("DELETE")).catch(() => {});
      throw error;
    }
    return roadmap.slug;
  },

  createCircle: async (input: CircleInput): Promise<string> => {
    const circle = await request<{ id: string }>(
      "/circles",
      json("POST", {
        name: input.name,
        visibility: input.visibility,
        maxMembers: input.maxMembers,
        startDate: input.startDate || null,
        targetEndDate: input.endDate || null,
        ...(input.targetType === "Book"
          ? { targetType: "BOOK", bookId: input.targetId }
          : { targetType: "ROADMAP", roadmapId: input.targetId }),
      }),
    );
    // アプリの「Meeting」は、API では Circle の Schedule
    const meeting = input.meeting ? new Date(input.meeting) : null;
    if (meeting && !Number.isNaN(meeting.getTime()))
      await request(
        `/circles/${circle.id}/schedules`,
        json("POST", { title: "Meeting", scheduledAt: meeting.toISOString() }),
      );
    return circle.id;
  },

  joinCircle: async (id: string): Promise<void> => {
    try {
      await request(`/circles/${id}/join`, json("POST"));
    } catch (error) {
      if (error instanceof ApiError && error.code === "CIRCLE_ALREADY_MEMBER")
        return;
      throw error;
    }
  },

  settings: async (settings: NotificationSettings): Promise<void> => {
    const { user } = await current();
    await request(
      "/me/notification-preferences",
      json("PATCH", {
        studyReminderEnabled: settings.study,
        studyReminderTime: settings.time,
        studyReminderTimezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo",
        circleReminderEnabled: settings.circle,
        progressNotificationEnabled: settings.progress,
        inviteNotificationEnabled: settings.invite,
      }),
    );
    // 曜日と対象 Roadmap は端末が鳴らす Local Notification の設定なので、端末内に持つ
    await updateLocal(user.id, (state) => {
      state.weekdays = settings.weekdays;
      state.reminderRoadmapId = settings.roadmapId;
    });
  },

  registerPush: async (token: string): Promise<void> => {
    // react-native に依存する処理は遅延 import する (unit test では読み込ませない)
    const { getDeviceId, devicePlatform } = await import("@/lib/storage");
    await request(
      "/me/devices",
      json("POST", {
        expoPushToken: token,
        platform: devicePlatform(),
        deviceId: await getDeviceId(),
      }),
    );
  },

  /** ログアウト・アカウント切り替え時に、前のユーザーの dashboard を捨てる */
  reset: () => {
    last = undefined;
  },
};
