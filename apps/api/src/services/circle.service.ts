import { db, type DbExecutor } from "../db/client";
import { toBookSummaryDto } from "../dto/book.dto";
import {
  type CircleDetailDto,
  type CircleScheduleDto,
  type CircleSummaryDto,
  type CircleTargetDto,
  toCircleMemberDto,
  toCircleScheduleDto,
  toCircleSummaryDto,
} from "../dto/circle.dto";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { buildPage, decodeCursor, type Page } from "../lib/pagination";
import {
  assertCanViewCircle,
  assertCircleOwner,
  canJoinCircle,
  type CircleViewerContext,
} from "../policies/circle.policy";
import { canViewRoadmap } from "../policies/roadmap.policy";
import * as bookRepository from "../repositories/book.repository";
import * as circleRepository from "../repositories/circle.repository";
import type { CircleRow } from "../repositories/circle.repository";
import * as roadmapRepository from "../repositories/roadmap.repository";
import * as userRepository from "../repositories/user.repository";
import type {
  CreateCircleInput,
  CreateScheduleInput,
  InviteToCircleInput,
  ListCirclesQuery,
  UpdateCircleInput,
  UpdateScheduleInput,
} from "../schemas/circle.schema";
import type { AuthUser } from "../types/app";
import * as notificationService from "./notification.service";

// ---------------------------------------------------------------------------
// 共通
// ---------------------------------------------------------------------------

async function getViewerContext(
  circleId: string,
  viewerId: string | null,
  executor: DbExecutor = db,
): Promise<CircleViewerContext> {
  if (!viewerId) return { role: null, isInvited: false };
  const [membership, isInvited] = await Promise.all([
    circleRepository.findMembership(circleId, viewerId, executor),
    circleRepository.hasInvite(circleId, viewerId, executor),
  ]);
  return { role: membership?.role ?? null, isInvited };
}

/** OWNER 専用操作の入口。Circle を返す */
async function getCircleAsOwner(circleId: string, user: AuthUser): Promise<CircleRow> {
  const circle = await circleRepository.findCircleById(circleId);
  const viewer = await getViewerContext(circleId, user.id);
  assertCircleOwner(circle, viewer);
  return circle;
}

async function buildTargetDto(circle: CircleRow): Promise<CircleTargetDto> {
  if (circle.targetType === "BOOK" && circle.bookId) {
    const book = await bookRepository.findBookById(circle.bookId);
    if (book) return { type: "BOOK", book: toBookSummaryDto(book) };
  }
  if (circle.targetType === "ROADMAP" && circle.roadmapId) {
    const roadmap = await roadmapRepository.findRoadmapById(circle.roadmapId);
    if (roadmap) {
      return {
        type: "ROADMAP",
        roadmap: { id: roadmap.id, slug: roadmap.slug, title: roadmap.title },
      };
    }
  }
  // FK と CHECK 制約があるため通常は到達しない
  throw new Error(`Circle ${circle.id} has no valid target`);
}

// ---------------------------------------------------------------------------
// 読み取り
// ---------------------------------------------------------------------------

/** GET /circles — PUBLIC のみ */
export async function listPublicCircles(query: ListCirclesQuery): Promise<Page<CircleSummaryDto>> {
  const rows = await circleRepository.listCircleSummaries({
    visibility: "PUBLIC",
    q: query.q,
    targetType: query.targetType,
    roadmapId: query.roadmapId,
    bookId: query.bookId,
    cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
    limit: query.limit + 1,
  });
  const page = buildPage(rows, query.limit);
  return { items: page.items.map(toCircleSummaryDto), nextCursor: page.nextCursor };
}

/** GET /me/circles — 自分が参加している Circle (INVITE_ONLY を含む) */
export async function listMyCircles(user: AuthUser): Promise<CircleSummaryDto[]> {
  const rows = await circleRepository.listCircleSummaries({ memberUserId: user.id, limit: 100 });
  return rows.map(toCircleSummaryDto);
}

/** GET /circles/:id */
export async function getCircleDetail(
  circleId: string,
  viewer: AuthUser | null,
): Promise<CircleDetailDto> {
  const circle = await circleRepository.findCircleById(circleId);
  const viewerContext = await getViewerContext(circleId, viewer?.id ?? null);
  assertCanViewCircle(circle, viewerContext);

  const [target, members, schedules] = await Promise.all([
    buildTargetDto(circle),
    circleRepository.listMembers(circleId),
    circleRepository.listSchedules(circleId),
  ]);

  return {
    ...toCircleSummaryDto({ ...circle, memberCount: members.length }),
    target,
    members: members.map(toCircleMemberDto),
    schedules: schedules.map(toCircleScheduleDto),
    viewer: viewerContext,
  };
}

// ---------------------------------------------------------------------------
// 作成・更新・削除
// ---------------------------------------------------------------------------

/** 対象の Book / Roadmap が存在し、Circle の対象にしてよいかを確認する */
async function assertValidTarget(user: AuthUser, input: CreateCircleInput): Promise<void> {
  if (input.targetType === "BOOK") {
    const book = await bookRepository.findBookById(input.bookId);
    if (!book) throw notFound("BOOK_NOT_FOUND", "Book not found");
    return;
  }

  const roadmap = await roadmapRepository.findRoadmapById(input.roadmapId);
  if (!roadmap || !canViewRoadmap(roadmap, user.id)) {
    throw notFound("ROADMAP_NOT_FOUND", "Roadmap not found");
  }
  // PUBLIC Circle 経由で PRIVATE Roadmap の存在やタイトルが漏れないようにする
  if (roadmap.visibility === "PRIVATE" && input.visibility === "PUBLIC") {
    throw badRequest(
      "CIRCLE_INVALID_TARGET",
      "A public circle cannot target a private roadmap",
    );
  }
}

export async function createCircle(
  user: AuthUser,
  input: CreateCircleInput,
): Promise<CircleDetailDto> {
  await assertValidTarget(user, input);

  const circleId = await db.transaction(async (tx) => {
    const circle = await circleRepository.insertCircle(
      {
        creatorId: user.id,
        name: input.name,
        description: input.description,
        targetType: input.targetType,
        bookId: input.targetType === "BOOK" ? input.bookId : null,
        roadmapId: input.targetType === "ROADMAP" ? input.roadmapId : null,
        visibility: input.visibility,
        startDate: input.startDate,
        targetEndDate: input.targetEndDate,
        maxMembers: input.maxMembers,
      },
      tx,
    );
    // 作成者は必ず OWNER として参加する
    await circleRepository.insertMember({ circleId: circle.id, userId: user.id, role: "OWNER" }, tx);
    return circle.id;
  });

  return getCircleDetail(circleId, user);
}

export async function updateCircle(
  user: AuthUser,
  circleId: string,
  input: UpdateCircleInput,
): Promise<CircleDetailDto> {
  const circle = await getCircleAsOwner(circleId, user);

  const startDate = input.startDate === undefined ? circle.startDate : input.startDate;
  const targetEndDate =
    input.targetEndDate === undefined ? circle.targetEndDate : input.targetEndDate;
  if (startDate && targetEndDate && startDate > targetEndDate) {
    throw badRequest("VALIDATION_ERROR", "targetEndDate must be on or after startDate");
  }

  if (input.visibility === "PUBLIC" && circle.roadmapId) {
    const roadmap = await roadmapRepository.findRoadmapById(circle.roadmapId);
    if (roadmap?.visibility === "PRIVATE") {
      throw badRequest(
        "CIRCLE_INVALID_TARGET",
        "A public circle cannot target a private roadmap",
      );
    }
  }

  await db.transaction(async (tx) => {
    // join と同じ行ロックを取り、maxMembers の変更と参加が競合しないようにする
    await circleRepository.findCircleById(circleId, tx, { forUpdate: true });
    if (input.maxMembers !== undefined) {
      const memberCount = await circleRepository.countMembers(circleId, tx);
      if (input.maxMembers < memberCount) {
        throw badRequest(
          "VALIDATION_ERROR",
          "maxMembers cannot be less than the current number of members",
        );
      }
    }
    await circleRepository.updateCircle(circleId, input, tx);
  });

  return getCircleDetail(circleId, user);
}

export async function deleteCircle(user: AuthUser, circleId: string): Promise<void> {
  await getCircleAsOwner(circleId, user);
  await circleRepository.deleteCircle(circleId);
}

// ---------------------------------------------------------------------------
// 参加・退出・招待
// ---------------------------------------------------------------------------

export async function joinCircle(user: AuthUser, circleId: string): Promise<CircleDetailDto> {
  const circleName = await db.transaction(async (tx) => {
    // Circle 行をロックして「人数確認 -> 追加」を直列化する (maxMembers を超えない)
    const circle = await circleRepository.findCircleById(circleId, tx, { forUpdate: true });
    const viewer = await getViewerContext(circleId, user.id, tx);
    assertCanViewCircle(circle, viewer);
  
    if (viewer.role !== null) {
      throw conflict("CIRCLE_ALREADY_MEMBER", "You are already a member of this circle");
    }
    if (!canJoinCircle(circle, viewer)) {
      throw forbidden("This circle is invite-only");
    }
    const memberCount = await circleRepository.countMembers(circleId, tx);
    if (memberCount >= circle.maxMembers) {
      throw conflict("CIRCLE_FULL", "This circle has reached its member limit");
    }

    await circleRepository.insertMember({ circleId, userId: user.id, role: "MEMBER" }, tx);
    await circleRepository.deleteInvite(circleId, user.id, tx);
    return circle.name;
  });

  await notificationService.notifyCircleJoined({
    joinedUserId: user.id,
    joinedUserName: user.name,
    circleId,
    circleName,
  });
  return getCircleDetail(circleId, user);
}

/** V1 では OWNER は退出できない (Circle を削除する必要がある) */
export async function leaveCircle(user: AuthUser, circleId: string): Promise<void> {
  const circle = await circleRepository.findCircleById(circleId);
  const viewer = await getViewerContext(circleId, user.id);
  assertCanViewCircle(circle, viewer);

  if (viewer.role === null) {
    throw conflict("CIRCLE_NOT_MEMBER", "You are not a member of this circle");
  }
  if (viewer.role === "OWNER") {
    throw conflict(
      "CIRCLE_OWNER_CANNOT_LEAVE",
      "The owner cannot leave the circle. Delete the circle instead",
    );
  }
  await circleRepository.deleteMember(circleId, user.id);
}

/** POST /circles/:id/invites — OWNER が username を指定して招待する */
export async function inviteToCircle(
  user: AuthUser,
  circleId: string,
  input: InviteToCircleInput,
): Promise<void> {
  const circle = await getCircleAsOwner(circleId, user);

  const invitedUser = await userRepository.findUserByUsername(input.username);
  if (!invitedUser) throw notFound("USER_NOT_FOUND", "User not found");

  const membership = await circleRepository.findMembership(circleId, invitedUser.id);
  if (membership) {
    throw conflict("CIRCLE_ALREADY_MEMBER", "This user is already a member of the circle");
  }

  const isNewInvite = await circleRepository.insertInvite({
    circleId,
    invitedUserId: invitedUser.id,
    invitedById: user.id,
  });
  // 再招待では通知を重ねて送らない
  if (!isNewInvite) return;

  await notificationService.notifyCircleInvite({
    invitedUserId: invitedUser.id,
    inviterName: user.name,
    circleId,
    circleName: circle.name,
  });
}

// ---------------------------------------------------------------------------
// Schedule (OWNER のみ)
// ---------------------------------------------------------------------------

export async function createSchedule(
  user: AuthUser,
  circleId: string,
  input: CreateScheduleInput,
): Promise<CircleScheduleDto> {
  await getCircleAsOwner(circleId, user);
  const schedule = await circleRepository.insertSchedule({
    circleId,
    title: input.title,
    scheduledAt: new Date(input.scheduledAt),
    description: input.description,
  });
  return toCircleScheduleDto(schedule);
}

export async function updateSchedule(
  user: AuthUser,
  circleId: string,
  scheduleId: string,
  input: UpdateScheduleInput,
): Promise<CircleScheduleDto> {
  await getCircleAsOwner(circleId, user);
  const existing = await circleRepository.findSchedule(circleId, scheduleId);
  if (!existing) throw notFound("CIRCLE_SCHEDULE_NOT_FOUND", "Schedule not found");

  const schedule = await circleRepository.updateSchedule(scheduleId, {
    title: input.title,
    description: input.description,
    // 日時を変えたら Meeting Reminder を送り直せるようにする
    ...(input.scheduledAt
      ? { scheduledAt: new Date(input.scheduledAt), reminderSentAt: null }
      : {}),
  });
  return toCircleScheduleDto(schedule);
}

export async function deleteSchedule(
  user: AuthUser,
  circleId: string,
  scheduleId: string,
): Promise<void> {
  await getCircleAsOwner(circleId, user);
  const existing = await circleRepository.findSchedule(circleId, scheduleId);
  if (!existing) throw notFound("CIRCLE_SCHEDULE_NOT_FOUND", "Schedule not found");
  await circleRepository.deleteSchedule(scheduleId);
}
