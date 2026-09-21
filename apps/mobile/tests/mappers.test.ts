import { describe, expect, it } from "vitest";
import {
  formatDuration,
  fromApiCategory,
  fromApiDifficulty,
  parseDuration,
  toApiCategory,
  toCircle,
  toDatabase,
  toEnrollment,
} from "../src/api/mappers";
import { ApiCircle, ApiDashboard } from "../src/api/remoteTypes";

const user = (name: string) => ({
  id: name,
  name,
  username: name.toLowerCase(),
  avatarUrl: null,
});
const local = { interests: [], weekdays: [2, 3], bookCovers: {} };

describe("duration", () => {
  it("日本語の目安期間を日数に直す", () => {
    expect(parseDuration("約3か月")).toBe(90);
    expect(parseDuration("２週間")).toBe(14);
    expect(parseDuration("10日")).toBe(10);
    expect(parseDuration("1.5ヶ月")).toBe(45);
    expect(parseDuration("21")).toBe(21);
    expect(parseDuration("じっくり")).toBeNull();
  });
  it("日数を読みやすい単位で表示する", () => {
    expect(formatDuration(90)).toBe("3か月");
    expect(formatDuration(14)).toBe("2週間");
    expect(formatDuration(10)).toBe("10日");
    expect(formatDuration(null)).toBe("");
  });
});

describe("enum", () => {
  it("category / difficulty を相互に変換する", () => {
    expect(toApiCategory("Engineering")).toBe("ENGINEERING");
    expect(fromApiCategory("MARKETING")).toBe("Marketing");
    expect(fromApiCategory("OTHER")).toBe("Business");
    expect(fromApiDifficulty("INTERMEDIATE")).toBe("Intermediate");
  });
});

describe("enrollment", () => {
  it("COMPLETED は 100%、PERCENTAGE はその値。未着手の Step は含めない", () => {
    const enrollment = toEnrollment({
      userRoadmapId: "ur",
      roadmapId: "r",
      status: "IN_PROGRESS",
      startedAt: "2026-09-01T00:00:00.000Z",
      steps: [
        { stepId: "a", status: "COMPLETED", progressType: "NONE", progressValue: null },
        { stepId: "b", status: "READING", progressType: "PERCENTAGE", progressValue: "42" },
        { stepId: "c", status: "READING", progressType: "CHAPTER", progressValue: "Chapter 4" },
        { stepId: "d", status: "NOT_STARTED", progressType: "NONE", progressValue: null },
      ],
    });
    expect(enrollment.progress).toEqual({
      a: { percentage: 100, status: "COMPLETED" },
      b: { percentage: 42, status: "READING" },
      c: { percentage: 0, status: "READING" },
    });
  });
});

describe("circle", () => {
  const circle: ApiCircle = {
    id: "c1",
    name: "Together",
    targetType: "ROADMAP",
    bookId: null,
    roadmapId: "r1",
    visibility: "PUBLIC",
    startDate: "2026-09-01",
    targetEndDate: null,
    maxMembers: 8,
    members: [
      { role: "OWNER", user: user("Yuki"), progress: { stepIndex: 2, percentage: 10 } },
      { role: "MEMBER", user: user("Mika"), progress: { stepIndex: 1, percentage: 50 } },
      { role: "MEMBER", user: user("Ren"), progress: null },
    ],
    nextSchedule: null,
  };
  it("メンバーは名前、進捗は共有されている人だけ。現在地は最後尾に合わせる", () => {
    const mapped = toCircle(circle);
    expect(mapped).toMatchObject({
      targetType: "Roadmap",
      targetId: "r1",
      endDate: "",
      meeting: "",
      members: ["Yuki", "Mika", "Ren"],
      memberProgress: {
        Yuki: { step: 2, percentage: 10 },
        Mika: { step: 1, percentage: 50 },
      },
      currentStep: 1,
      progress: 30,
    });
  });
  it("次の Schedule を端末時刻の meeting に直す", () => {
    const mapped = toCircle({
      ...circle,
      nextSchedule: { id: "s", title: "Meeting", scheduledAt: new Date(2026, 8, 27, 20, 0).toISOString() },
    });
    expect(mapped.meeting).toBe("2026-09-27T20:00");
  });
});

describe("dashboard", () => {
  const api: ApiDashboard = {
    user: { ...user("Hina"), email: "h@example.com", bio: null, usernameConfirmed: false },
    roadmaps: [],
    userRoadmaps: [
      { userRoadmapId: "u1", roadmapId: "r1", status: "IN_PROGRESS", startedAt: null, steps: [] },
      { userRoadmapId: "u2", roadmapId: "r2", status: "IN_PROGRESS", startedAt: null, steps: [] },
    ],
    books: [{ id: "b1", title: "Book", author: "A", coverImageUrl: null }],
    circles: [],
    notificationPreferences: {
      studyReminderEnabled: true,
      studyReminderTime: "07:30",
      studyReminderTimezone: "Asia/Tokyo",
      circleReminderEnabled: true,
      progressNotificationEnabled: false,
      inviteNotificationEnabled: true,
    },
  };
  it("onboarded (興味選択まで完了) と usernameConfirmed (username を自分で決めた) は別", () => {
    // 登録直後
    expect(toDatabase(api, local).profile).toMatchObject({
      onboarded: false,
      usernameConfirmed: false,
      bio: "",
    });
    // 興味を選び終えた。username はまだ仮のまま -> アプリは使えるが、Me で username を聞く
    expect(toDatabase(api, { ...local, onboarded: true }).profile).toMatchObject({
      onboarded: true,
      usernameConfirmed: false,
    });
    // username を決め終えた人は、別の端末 (local が空) でも onboarding をやり直さない
    const confirmed = { ...api, user: { ...api.user, usernameConfirmed: true } };
    expect(toDatabase(confirmed, local).profile).toMatchObject({
      onboarded: true,
      usernameConfirmed: true,
    });
  });
  it("端末内の状態 (メイン Roadmap・表紙・曜日) を重ねる", () => {
    const db = toDatabase(api, {
      ...local,
      primaryRoadmapId: "r2",
      bookCovers: { b1: "file:///cover.jpg" },
    });
    expect(db.enrollments.map((e) => e.roadmapId)).toEqual(["r2", "r1"]);
    expect(db.books[0].coverUri).toBe("file:///cover.jpg");
    expect(db.notifications).toMatchObject({ study: true, time: "07:30", progress: false, weekdays: [2, 3] });
  });
});
