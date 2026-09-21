import {
  Book,
  Category,
  Circle,
  Database,
  Enrollment,
  Roadmap,
  categories,
} from "@/types/domain";
import { LocalState } from "./localState";
import {
  ApiBookSummary,
  ApiCategory,
  ApiCircle,
  ApiDashboard,
  ApiDifficulty,
  ApiRoadmap,
  ApiStepProgress,
  ApiUserRoadmap,
} from "./remoteTypes";

// API の DTO <-> アプリの domain model の変換。副作用のない純粋関数だけを置く
// (tests/mappers.test.ts でテストしている)。

// ---- category / difficulty -------------------------------------------------
export const toApiCategory = (value: Category) =>
  value.toUpperCase() as ApiCategory;
/** API にだけある OTHER は、アプリに該当カテゴリが無いので Business に寄せる */
export const fromApiCategory = (value: ApiCategory): Category =>
  categories.find((c) => c.toUpperCase() === value) ?? "Business";

export const toApiDifficulty = (value: Roadmap["difficulty"]) =>
  value.toUpperCase() as ApiDifficulty;
export const fromApiDifficulty = (value: ApiDifficulty) =>
  (value.charAt(0) + value.slice(1).toLowerCase()) as Roadmap["difficulty"];

// ---- duration ("3か月" <-> estimatedDays) -----------------------------------
const units: [RegExp, number][] = [
  [/年|years?/i, 365],
  [/か月|ヶ月|ヵ月|カ月|ケ月|months?/i, 30],
  [/週|weeks?/i, 7],
  [/日|days?/i, 1],
];
/** "約3か月" -> 90。数字を読み取れなければ null (API では任意項目) */
export function parseDuration(text: string): number | null {
  const half = text.replace(/[０-９]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0xfee0),
  );
  const amount = Number(half.match(/\d+(\.\d+)?/)?.[0]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const perUnit = units.find(([pattern]) => pattern.test(half))?.[1] ?? 1;
  return Math.min(3650, Math.max(1, Math.round(amount * perUnit)));
}
export function formatDuration(days: number | null): string {
  if (!days) return "";
  if (days % 30 === 0) return `${days / 30}か月`;
  if (days % 7 === 0) return `${days / 7}週間`;
  return `${days}日`;
}

// ---- book ---------------------------------------------------------------------
const coverColors = [
  "#BA4E32",
  "#183D63",
  "#A44F32",
  "#345D6C",
  "#B63936",
  "#B49640",
  "#2B7777",
  "#437187",
];
/** 表紙画像が無い本の色。id から決めるので、どの端末でも同じ色になる */
function colorFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return coverColors[hash % coverColors.length];
}
export function toBook(book: ApiBookSummary, local: LocalState): Book {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverUri: book.coverImageUrl ?? local.bookCovers[book.id],
    color: colorFor(book.id),
    shortTitle: book.title,
  };
}

// ---- roadmap / enrollment -----------------------------------------------------
export function toRoadmap(roadmap: ApiRoadmap): Roadmap {
  return {
    id: roadmap.id,
    slug: roadmap.slug,
    title: roadmap.title,
    description: roadmap.description ?? "",
    category: fromApiCategory(roadmap.category),
    difficulty: fromApiDifficulty(roadmap.difficulty),
    duration: formatDuration(roadmap.estimatedDays),
    visibility: roadmap.visibility,
    creator: roadmap.creator.name,
    creatorUsername: roadmap.creator.username,
    completedUsers: roadmap.completedUserCount,
    steps: roadmap.steps.map((step) => ({
      id: step.id,
      bookId: step.book.id,
      why: step.description ?? "",
      checkpoint: step.checkpoint,
      duration: formatDuration(step.estimatedDays),
    })),
  };
}

export function stepPercentage(step: ApiStepProgress): number {
  if (step.status === "COMPLETED") return 100;
  if (step.progressType !== "PERCENTAGE" || step.progressValue === null)
    return 0;
  const value = Number(step.progressValue);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function toEnrollment(userRoadmap: ApiUserRoadmap): Enrollment {
  return {
    roadmapId: userRoadmap.roadmapId,
    startedAt: userRoadmap.startedAt ?? new Date(0).toISOString(),
    progress: Object.fromEntries(
      userRoadmap.steps
        .filter((step) => step.status !== "NOT_STARTED")
        .map((step) => [
          step.stepId,
          { percentage: stepPercentage(step), status: step.status },
        ]),
    ),
  };
}

// ---- circle ---------------------------------------------------------------------
/** ISO 日時 -> 端末のタイムゾーンでの "YYYY-MM-DDTHH:mm" (アプリの Circle.meeting の形式) */
export function toLocalDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toCircle(circle: ApiCircle): Circle {
  const shared = circle.members.flatMap((m) =>
    m.progress ? [{ name: m.user.name, ...m.progress }] : [],
  );
  return {
    id: circle.id,
    name: circle.name,
    targetType: circle.targetType === "BOOK" ? "Book" : "Roadmap",
    targetId: (circle.targetType === "BOOK"
      ? circle.bookId
      : circle.roadmapId)!,
    visibility: circle.visibility,
    startDate: circle.startDate ?? "",
    endDate: circle.targetEndDate ?? "",
    meeting: circle.nextSchedule
      ? toLocalDateTime(circle.nextSchedule.scheduledAt)
      : "",
    maxMembers: circle.maxMembers,
    members: circle.members.map((m) => m.user.name),
    memberProgress: Object.fromEntries(
      shared.map((m) => [
        m.name,
        { step: m.stepIndex, percentage: m.percentage },
      ]),
    ),
    // Circle 全体の現在地 = いちばん後ろにいるメンバーの位置 (全員で進むための表示)
    currentStep: shared.length
      ? Math.min(...shared.map((m) => m.stepIndex))
      : 0,
    progress: shared.length
      ? Math.round(
          shared.reduce((sum, m) => sum + m.percentage, 0) / shared.length,
        )
      : 0,
    announcement: "一緒に、一歩ずつ学びを進めましょう。",
  };
}

// ---- dashboard --------------------------------------------------------------------
export function toDatabase(api: ApiDashboard, local: LocalState): Database {
  const enrollments = api.userRoadmaps.map(toEnrollment);
  // メインの Roadmap を先頭にする (アプリは enrollments[0] をメインとして扱う)
  enrollments.sort((a, b) =>
    a.roadmapId === local.primaryRoadmapId
      ? -1
      : b.roadmapId === local.primaryRoadmapId
        ? 1
        : 0,
  );
  return {
    version: 1,
    profile: {
      name: api.user.name,
      username: api.user.username,
      bio: api.user.bio ?? "",
      avatarUri: local.avatarUri ?? api.user.avatarUrl ?? undefined,
      interests: local.interests,
      // username を自分で決め終えているか (Apple / Google 登録の直後は false)
      onboarded: api.user.usernameConfirmed,
    },
    roadmaps: api.roadmaps.map(toRoadmap),
    books: api.books.map((book) => toBook(book, local)),
    enrollments,
    circles: api.circles.map(toCircle),
    notifications: {
      study: api.notificationPreferences.studyReminderEnabled,
      time: api.notificationPreferences.studyReminderTime,
      circle: api.notificationPreferences.circleReminderEnabled,
      progress: api.notificationPreferences.progressNotificationEnabled,
      invite: api.notificationPreferences.inviteNotificationEnabled,
      weekdays: local.weekdays,
      roadmapId: local.reminderRoadmapId,
    },
  };
}
