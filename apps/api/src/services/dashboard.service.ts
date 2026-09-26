import { toBookSummaryDto } from "../dto/book.dto";
import { toCircleScheduleDto, toCircleSummaryDto } from "../dto/circle.dto";
import type {
  DashboardCircleDto,
  DashboardDto,
  DashboardRoadmapDto,
  DashboardUserRoadmapDto,
} from "../dto/dashboard.dto";
import { toRoadmapStepDto, toRoadmapSummaryDto } from "../dto/roadmap.dto";
import { toUserSummaryDto } from "../dto/user.dto";
import * as bookRepository from "../repositories/book.repository";
import * as circleRepository from "../repositories/circle.repository";
import * as roadmapRepository from "../repositories/roadmap.repository";
import * as userRoadmapRepository from "../repositories/user-roadmap.repository";
import type { AuthUser } from "../types/app";
import * as notificationPreferenceService from "./notification-preference.service";
import { buildMemberProgress } from "./circle.service";
import { toStepProgressDto } from "./progress.service";
import * as userService from "./user.service";

// GET /me/dashboard の組み立て。
//
// アプリは「起動時に 1 回取得し、更新のたびに取り直す」設計なので、
// 画面ごとに何十回も API を呼ばせる代わりに、ここで少数のクエリにまとめる。
// 認可の考え方は他の API と同じ: 他人の PRIVATE / INVITE_ONLY のものは含めない。

const PUBLIC_ROADMAP_LIMIT = 50;
const PUBLIC_CIRCLE_LIMIT = 50;
const RECENT_BOOK_LIMIT = 100;

const uniqueById = <T extends { id: string }>(rows: T[]): T[] => [
  ...new Map(rows.map((row) => [row.id, row])).values(),
];

export async function getDashboard(user: AuthUser): Promise<DashboardDto> {
  const [currentUser, notificationPreferences, myUserRoadmaps, publicCircles, myCircles] =
    await Promise.all([
      userService.getCurrentUser(user),
      notificationPreferenceService.getPreferences(user),
      userRoadmapRepository.listUserRoadmaps({ userId: user.id }),
      circleRepository.listCircleSummaries({ visibility: "PUBLIC", limit: PUBLIC_CIRCLE_LIMIT }),
      circleRepository.listCircleSummaries({ memberUserId: user.id, limit: 100 }),
    ]);
  const circleRows = uniqueById([...myCircles, ...publicCircles]);
  const myCircleIds = new Set(myCircles.map((circle) => circle.id));

  // --- Roadmaps: PUBLIC の新着 + 自分が作成 + 学習中 + 自分の Circle の対象 ---------
  const relatedRoadmapIds = [
    ...myUserRoadmaps.map((userRoadmap) => userRoadmap.roadmap.id),
    ...myCircles.flatMap((circle) => (circle.roadmapId ? [circle.roadmapId] : [])),
  ];
  const [publicRoadmaps, createdRoadmaps, relatedRoadmaps] = await Promise.all([
    roadmapRepository.listRoadmapSummaries({ visibility: "PUBLIC", limit: PUBLIC_ROADMAP_LIMIT }),
    roadmapRepository.listRoadmapSummaries({ creatorId: user.id, limit: 100 }),
    roadmapRepository.listRoadmapSummaries({ ids: relatedRoadmapIds, limit: 200 }),
  ]);
  const roadmapRows = uniqueById([...createdRoadmaps, ...relatedRoadmaps, ...publicRoadmaps]);
  const stepRows = await roadmapRepository.listStepsByRoadmapIds(roadmapRows.map((r) => r.id));
  const stepsByRoadmapId = Map.groupBy(stepRows, (step) => step.roadmapId);

  const roadmaps: DashboardRoadmapDto[] = roadmapRows.map((row) => ({
    ...toRoadmapSummaryDto(row),
    steps: (stepsByRoadmapId.get(row.id) ?? []).map(toRoadmapStepDto),
  }));

  // --- 自分の進捗 -------------------------------------------------------------------
  const myProgressRows = await userRoadmapRepository.listStepsWithProgress(
    myUserRoadmaps.map((userRoadmap) => userRoadmap.id),
  );
  const myProgressByUserRoadmapId = Map.groupBy(myProgressRows, (row) => row.userRoadmapId);
  const userRoadmaps: DashboardUserRoadmapDto[] = myUserRoadmaps.map((userRoadmap) => ({
    userRoadmapId: userRoadmap.id,
    roadmapId: userRoadmap.roadmap.id,
    status: userRoadmap.status,
    startedAt: userRoadmap.startedAt?.toISOString() ?? null,
    completedAt: userRoadmap.completedAt?.toISOString() ?? null,
    steps: (myProgressByUserRoadmapId.get(userRoadmap.id) ?? []).map(toStepProgressDto),
  }));

  // --- Circles ------------------------------------------------------------------------
  const circleIds = circleRows.map((circle) => circle.id);
  const [memberRows, scheduleRows, memberProgress] = await Promise.all([
    circleRepository.listMembersByCircleIds(circleIds),
    circleRepository.listUpcomingSchedulesByCircleIds(circleIds, new Date()),
    buildMemberProgress(myCircles),
  ]);
  const membersByCircleId = Map.groupBy(memberRows, (member) => member.circleId);
  const schedulesByCircleId = Map.groupBy(scheduleRows, (schedule) => schedule.circleId);

  const circles: DashboardCircleDto[] = circleRows.map((row) => {
    const members = membersByCircleId.get(row.id) ?? [];
    const nextSchedule = schedulesByCircleId.get(row.id)?.[0];
    return {
      ...toCircleSummaryDto(row),
      members: members.map((member) => ({
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
        user: toUserSummaryDto(member.user),
        // メンバーの進捗は、自分も参加している Circle でだけ共有する
        progress: myCircleIds.has(row.id)
          ? (memberProgress.get(`${row.id}:${member.user.id}`) ?? null)
          : null,
      })),
      nextSchedule: nextSchedule ? toCircleScheduleDto(nextSchedule) : null,
      viewerRole: members.find((member) => member.user.id === user.id)?.role ?? null,
    };
  });

  // --- Books: 上で参照されるもの + 新着 ------------------------------------------------
  const referencedBooks = stepRows.map((step) => step.book);
  const circleBookIds = circleRows.flatMap((circle) => (circle.bookId ? [circle.bookId] : []));
  const [circleBooks, recentBooks] = await Promise.all([
    bookRepository.findBooksByIds(circleBookIds),
    bookRepository.searchBooks({ limit: RECENT_BOOK_LIMIT }),
  ]);
  const books = uniqueById([...referencedBooks, ...circleBooks, ...recentBooks]).map(
    toBookSummaryDto,
  );

  return { user: currentUser, roadmaps, userRoadmaps, books, circles, notificationPreferences };
}
