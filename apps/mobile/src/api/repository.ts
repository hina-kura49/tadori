import {
  BookInput,
  Database,
  Profile,
  RoadmapInput,
  CircleInput,
  NotificationSettings,
} from "@/types/domain";
import { createSeed } from "./seed";
import { storage } from "@/lib/storage";
import { normalizeProgress } from "@/lib/progress";
import { apiUrl } from "./client";
import { remote } from "./remote";
const key = "tadori.database.v1";
let queue: Promise<unknown> = Promise.resolve();
async function read(): Promise<Database> {
  const raw = await storage.get(key);
  if (!raw) return createSeed();
  const data = JSON.parse(raw) as Database;
  if (data.version !== 1 || !Array.isArray(data.roadmaps) || !data.profile)
    throw new Error("保存されたデータを読み込めませんでした。");
  // Upgrade existing local demo circles without replacing user-created data.
  const seeds = createSeed().circles;
  data.circles.forEach((circle) => {
    if (!circle.memberProgress)
      circle.memberProgress =
        seeds.find((seed) => seed.id === circle.id)?.memberProgress ?? {};
  });
  return data;
}
function mutate<T>(fn: (db: Database) => T): Promise<T> {
  const task = queue.then(async () => {
    const db = await read();
    const result = fn(db);
    await storage.set(key, JSON.stringify(db));
    return result;
  });
  queue = task.catch(() => {});
  return task;
}
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
export const repository = {
  createBook: (input: BookInput) =>
    apiUrl
      ? remote.createBook(input)
      : mutate((db) => {
          const id = uid();
          db.books.push({
            ...input,
            id,
            color: "#E5EBE3",
            shortTitle: input.title,
            registeredBy: db.profile.username,
          });
          return id;
        }),
  getDashboard: (): Promise<Database> =>
    apiUrl ? remote.getDashboard() : read(),
  saveProfile: (profile: Profile) =>
    apiUrl
      ? remote.saveProfile(profile)
      : mutate((db) => {
          const previous = db.profile.name;
          const previousUsername = db.profile.username;
          db.profile = profile;
          db.roadmaps
            .filter((r) => r.creatorUsername === previousUsername)
            .forEach((r) => {
              r.creator = profile.name;
              r.creatorUsername = profile.username;
            });
          if (previous)
            db.circles.forEach((c) => {
              c.members = c.members.map((m) =>
                m === previous ? profile.name : m,
              );
            });
          return profile;
        }),
  enroll: (roadmapId: string) =>
    apiUrl
      ? remote.enroll(roadmapId)
      : mutate((db) => {
          if (!db.roadmaps.some((r) => r.id === roadmapId))
            throw new Error("Roadmapが見つかりません。");
          if (!db.enrollments.some((e) => e.roadmapId === roadmapId))
            db.enrollments.push({
              roadmapId,
              progress: {},
              startedAt: new Date().toISOString(),
            });
        }),
  setPrimary: (roadmapId: string) =>
    apiUrl
      ? remote.setPrimary(roadmapId)
      : mutate((db) => {
          db.enrollments.sort((a, b) =>
            a.roadmapId === roadmapId ? -1 : b.roadmapId === roadmapId ? 1 : 0,
          );
        }),
  progress: (roadmapId: string, stepId: string, value: number) => {
    const progress = normalizeProgress(value);
    return apiUrl
      ? remote.progress(roadmapId, stepId, value)
      : mutate((db) => {
          const e = db.enrollments.find((e) => e.roadmapId === roadmapId);
          const r = db.roadmaps.find((r) => r.id === roadmapId);
          if (!e || !r?.steps.some((s) => s.id === stepId))
            throw new Error("まずRoadmapを学習に追加してください。");
          e.progress[stepId] = progress;
        });
  },
  createRoadmap: (input: RoadmapInput) =>
    apiUrl
      ? remote.createRoadmap(input)
      : mutate((db) => {
          const id = uid();
          db.roadmaps.push({
            ...input,
            id,
            slug: id,
            creator: db.profile.name,
            creatorUsername: db.profile.username,
            completedUsers: 0,
          });
          return id;
        }),
  createCircle: (input: CircleInput) =>
    apiUrl
      ? remote.createCircle(input)
      : mutate((db) => {
          const id = uid();
          db.circles.push({
            ...input,
            id,
            members: [db.profile.name],
            progress: 0,
            currentStep: 0,
            announcement: "一緒に、一歩ずつ学びを進めましょう。",
          });
          return id;
        }),
  joinCircle: (id: string) =>
    apiUrl
      ? remote.joinCircle(id)
      : mutate((db) => {
          const c = db.circles.find((c) => c.id === id);
          if (!c) throw new Error("Circleが見つかりません。");
          if (c.members.includes(db.profile.name)) return;
          if (c.visibility === "INVITE_ONLY")
            throw new Error("参加するには招待が必要です。");
          if (c.members.length >= c.maxMembers)
            throw new Error("このCircleは満員です。");
          c.members.push(db.profile.name);
        }),
  settings: (settings: NotificationSettings) =>
    apiUrl
      ? remote.settings(settings)
      : mutate((db) => {
          db.notifications = settings;
        }),
  registerPush: (token: string) =>
    apiUrl
      ? remote.registerPush(token)
      : Promise.resolve(),
};
