import { db } from "../db/client";
import { toBookSummaryDto } from "../dto/book.dto";
import type { MyRoadmapDto, MyRoadmapStepDto } from "../dto/my-roadmap.dto";
import type { StepProgressDto, UserProgressDto } from "../dto/roadmap.dto";
import { isUniqueViolation } from "../lib/db-errors";
import { badRequest, conflict, notFound } from "../lib/errors";
import { assertCanViewRoadmap, assertOwnsUserRoadmap } from "../policies/roadmap.policy";
import * as roadmapRepository from "../repositories/roadmap.repository";
import * as userRoadmapRepository from "../repositories/user-roadmap.repository";
import type {
  StepWithProgressRow,
  UserRoadmapWithRoadmapRow,
} from "../repositories/user-roadmap.repository";
import type {
  ListMyRoadmapsQuery,
  UpdateStepProgressInput,
  UpdateUserRoadmapInput,
} from "../schemas/progress.schema";
import type { AuthUser } from "../types/app";
import * as notificationService from "./notification.service";

// Roadmap の「開始」と「進捗」に関する Business Logic。
//
// 方針 (ここで一つに統一する):
// - Roadmap を開始したら、最初の Step を READING にする
// - Step を COMPLETED にしたら、後ろにある最初の未完了 Step を READING にする
// - 全 Step が COMPLETED になったら UserRoadmap を COMPLETED にする
// - progressPercentage / currentStep / nextStep は毎回計算する派生値。DB には保存しない

// ---------------------------------------------------------------------------
// 派生値の計算 (純粋関数)
// ---------------------------------------------------------------------------

export type DerivedProgress = {
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  currentStep: StepWithProgressRow | null;
  nextStep: StepWithProgressRow | null;
};

/** steps は position 昇順であること */
export function deriveProgress(steps: StepWithProgressRow[]): DerivedProgress {
  const totalSteps = steps.length;
  const completedSteps = steps.filter((step) => step.status === "COMPLETED").length;
  const progressPercentage =
    totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

  // READING の Step があればそれが current。無ければ最初の未完了 Step。
  const remaining = steps.filter((step) => step.status !== "COMPLETED");
  const currentStep = remaining.find((step) => step.status === "READING") ?? remaining[0] ?? null;
  const nextStep = currentStep
    ? (remaining.find((step) => step.position > currentStep.position) ?? null)
    : null;

  return { totalSteps, completedSteps, progressPercentage, currentStep, nextStep };
}

// ---------------------------------------------------------------------------
// DTO 変換
// ---------------------------------------------------------------------------

function toMyRoadmapStepDto(step: StepWithProgressRow): MyRoadmapStepDto {
  return {
    stepId: step.stepId,
    position: step.position,
    checkpoint: step.checkpoint,
    book: toBookSummaryDto(step.book),
    status: step.status,
    progressType: step.progressType,
    progressValue: step.progressValue,
  };
}

/**
 * Step の進捗を 0〜100 に直す。COMPLETED は 100、PERCENTAGE はその値、
 * PAGE / CHAPTER は総量が分からないので 0 として扱う。
 */
export function stepPercentage(step: {
  status: StepWithProgressRow["status"] | null;
  progressType: StepWithProgressRow["progressType"] | null;
  progressValue: string | null;
}): number {
  if (step.status === "COMPLETED") return 100;
  if (step.progressType !== "PERCENTAGE" || step.progressValue === null) return 0;
  const value = Number(step.progressValue);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function toStepProgressDto(step: StepWithProgressRow): StepProgressDto {
  return {
    stepId: step.stepId,
    status: step.status,
    progressType: step.progressType,
    progressValue: step.progressValue,
    startedAt: step.startedAt?.toISOString() ?? null,
    completedAt: step.completedAt?.toISOString() ?? null,
  };
}

function toMyRoadmapDto(
  userRoadmap: UserRoadmapWithRoadmapRow,
  steps: StepWithProgressRow[],
): MyRoadmapDto {
  const derived = deriveProgress(steps);
  return {
    userRoadmapId: userRoadmap.id,
    status: userRoadmap.status,
    startedAt: userRoadmap.startedAt?.toISOString() ?? null,
    completedAt: userRoadmap.completedAt?.toISOString() ?? null,
    roadmap: userRoadmap.roadmap,
    totalSteps: derived.totalSteps,
    completedSteps: derived.completedSteps,
    progressPercentage: derived.progressPercentage,
    currentStep: derived.currentStep ? toMyRoadmapStepDto(derived.currentStep) : null,
    nextStep: derived.nextStep ? toMyRoadmapStepDto(derived.nextStep) : null,
  };
}

/** UserRoadmap の一覧に、Step と進捗を 1 クエリでまとめて付ける */
async function buildMyRoadmapDtos(
  userRoadmaps: UserRoadmapWithRoadmapRow[],
): Promise<MyRoadmapDto[]> {
  const allSteps = await userRoadmapRepository.listStepsWithProgress(
    userRoadmaps.map((userRoadmap) => userRoadmap.id),
  );
  const stepsByUserRoadmapId = Map.groupBy(allSteps, (step) => step.userRoadmapId);

  return userRoadmaps.map((userRoadmap) =>
    toMyRoadmapDto(userRoadmap, stepsByUserRoadmapId.get(userRoadmap.id) ?? []),
  );
}

async function getMyRoadmapDto(userId: string, userRoadmapId: string): Promise<MyRoadmapDto> {
  const rows = await userRoadmapRepository.listUserRoadmaps({ userId, ids: [userRoadmapId] });
  const [dto] = await buildMyRoadmapDtos(rows);
  if (!dto) throw notFound("USER_ROADMAP_NOT_FOUND", "User roadmap not found");
  return dto;
}

// ---------------------------------------------------------------------------
// 読み取り
// ---------------------------------------------------------------------------

/** GET /me/roadmaps */
export async function listMyRoadmaps(
  user: AuthUser,
  query: ListMyRoadmapsQuery,
): Promise<MyRoadmapDto[]> {
  const rows = await userRoadmapRepository.listUserRoadmaps({
    userId: user.id,
    status: query.status,
  });
  return buildMyRoadmapDtos(rows);
}

/** 公開 Profile 用。PUBLIC Roadmap のものだけを返す */
export async function listPublicRoadmapsOfUser(
  userId: string,
  status: "IN_PROGRESS" | "COMPLETED",
  limit: number,
): Promise<MyRoadmapDto[]> {
  const rows = await userRoadmapRepository.listUserRoadmaps({
    userId,
    status,
    publicOnly: true,
    limit,
  });
  return buildMyRoadmapDtos(rows);
}

/** GET /roadmaps/:slug の userProgress。未開始なら null */
export async function getUserProgress(
  userId: string,
  roadmapId: string,
): Promise<UserProgressDto | null> {
  const userRoadmap = await userRoadmapRepository.findUserRoadmapByUserAndRoadmap(
    userId,
    roadmapId,
  );
  if (!userRoadmap) return null;

  const steps = await userRoadmapRepository.listStepsWithProgress([userRoadmap.id]);
  return {
    userRoadmapId: userRoadmap.id,
    status: userRoadmap.status,
    startedAt: userRoadmap.startedAt?.toISOString() ?? null,
    completedAt: userRoadmap.completedAt?.toISOString() ?? null,
    progressPercentage: deriveProgress(steps).progressPercentage,
    steps: steps.map(toStepProgressDto),
  };
}

// ---------------------------------------------------------------------------
// POST /roadmaps/:id/start
// ---------------------------------------------------------------------------

export async function startRoadmap(user: AuthUser, roadmapId: string): Promise<MyRoadmapDto> {
  const roadmap = await roadmapRepository.findRoadmapById(roadmapId);
  assertCanViewRoadmap(roadmap, user.id);

  const userRoadmapId = await db.transaction(async (tx) => {
    const steps = await roadmapRepository.listSteps(roadmapId, tx);
    if (steps.length === 0) {
      throw badRequest("ROADMAP_HAS_NO_STEPS", "This roadmap has no steps yet");
    }

    const now = new Date();
    let userRoadmap: userRoadmapRepository.UserRoadmapRow;
    try {
      userRoadmap = await userRoadmapRepository.insertUserRoadmap(
        { userId: user.id, roadmapId, status: "IN_PROGRESS", startedAt: now },
        tx,
      );
    } catch (error) {
      // UNIQUE(user_id, roadmap_id)。同時リクエストでも二重に開始されない
      if (isUniqueViolation(error)) {
        throw conflict("ROADMAP_ALREADY_STARTED", "You have already started this roadmap");
      }
      throw error;
    }

    await userRoadmapRepository.insertStepProgressRows(
      steps.map((step, index) => ({
        userRoadmapId: userRoadmap.id,
        roadmapStepId: step.id,
        status: index === 0 ? ("READING" as const) : ("NOT_STARTED" as const),
        startedAt: index === 0 ? now : null,
      })),
      tx,
    );
    return userRoadmap.id;
  });

  return getMyRoadmapDto(user.id, userRoadmapId);
}

// ---------------------------------------------------------------------------
// PATCH /me/roadmaps/:userRoadmapId  (一時停止 / 再開)
// ---------------------------------------------------------------------------

export async function updateUserRoadmapStatus(
  user: AuthUser,
  userRoadmapId: string,
  input: UpdateUserRoadmapInput,
): Promise<MyRoadmapDto> {
  const userRoadmap = await userRoadmapRepository.findUserRoadmapById(userRoadmapId);
  assertOwnsUserRoadmap(userRoadmap, user.id);

  // 完走済みの Roadmap は一時停止・再開の対象外 (状態を変えない)
  if (userRoadmap.status !== "COMPLETED") {
    await userRoadmapRepository.updateUserRoadmap(userRoadmapId, {
      status: input.status,
      startedAt: userRoadmap.startedAt ?? new Date(),
    });
  }
  return getMyRoadmapDto(user.id, userRoadmapId);
}

// ---------------------------------------------------------------------------
// PATCH /me/roadmaps/:userRoadmapId/steps/:stepId
// ---------------------------------------------------------------------------

/** transaction の結果として「commit 後に送る通知」を返すための型 */
type ProgressEvent =
  | { type: "ROADMAP_COMPLETED" }
  | { type: "NEXT_STEP_AVAILABLE"; nextBookTitle: string }
  | null;

export async function updateStepProgress(
  user: AuthUser,
  userRoadmapId: string,
  stepId: string,
  input: UpdateStepProgressInput,
): Promise<MyRoadmapDto> {
  const event = await db.transaction(async (tx): Promise<ProgressEvent> => {
    // 同じ UserRoadmap への同時更新を直列化する
    const userRoadmap = await userRoadmapRepository.findUserRoadmapById(userRoadmapId, tx, {
      forUpdate: true,
    });
    assertOwnsUserRoadmap(userRoadmap, user.id);

    const steps = await userRoadmapRepository.listStepsWithProgress([userRoadmapId], tx);
    const target = steps.find((step) => step.stepId === stepId);
    if (!target) throw notFound("ROADMAP_STEP_NOT_FOUND", "Step not found in this roadmap");

    // 1. 対象 Step の新しい状態を決める
    const now = new Date();
    const reportsProgress = input.progressType !== undefined && input.progressType !== "NONE";
    const newStatus =
      input.status ??
      (target.status === "NOT_STARTED" && reportsProgress ? "READING" : target.status);

    await userRoadmapRepository.upsertStepProgress(
      userRoadmapId,
      stepId,
      {
        status: newStatus,
        progressType: input.progressType ?? target.progressType,
        progressValue:
          input.progressType === undefined ? target.progressValue : (input.progressValue ?? null),
        startedAt: newStatus === "NOT_STARTED" ? null : (target.startedAt ?? now),
        completedAt: newStatus === "COMPLETED" ? (target.completedAt ?? now) : null,
      },
      tx,
    );

    // 2. 今回はじめて COMPLETED になったなら、次の未完了 Step を READING にする
    const justCompleted = newStatus === "COMPLETED" && target.status !== "COMPLETED";
    const nextStep = justCompleted
      ? steps.find((step) => step.position > target.position && step.status !== "COMPLETED")
      : undefined;
    if (nextStep?.status === "NOT_STARTED") {
      await userRoadmapRepository.upsertStepProgress(
        userRoadmapId,
        nextStep.stepId,
        {
          status: "READING",
          progressType: nextStep.progressType,
          progressValue: nextStep.progressValue,
          startedAt: now,
          completedAt: null,
        },
        tx,
      );
    }

    // 3. UserRoadmap の状態を決める
    const allCompleted = steps.every((step) =>
      step.stepId === stepId ? newStatus === "COMPLETED" : step.status === "COMPLETED",
    );
    if (allCompleted) {
      if (userRoadmap.status === "COMPLETED") return null;
      await userRoadmapRepository.updateUserRoadmap(
        userRoadmapId,
        { status: "COMPLETED", startedAt: userRoadmap.startedAt ?? now, completedAt: now },
        tx,
      );
      return { type: "ROADMAP_COMPLETED" };
    }

    // 未完走。完走済みから戻した場合・一時停止中・未開始の場合は IN_PROGRESS にする
    const isActive = newStatus !== "NOT_STARTED" || userRoadmap.status === "COMPLETED";
    if (isActive && userRoadmap.status !== "IN_PROGRESS") {
      await userRoadmapRepository.updateUserRoadmap(
        userRoadmapId,
        { status: "IN_PROGRESS", startedAt: userRoadmap.startedAt ?? now, completedAt: null },
        tx,
      );
    }
    return nextStep ? { type: "NEXT_STEP_AVAILABLE", nextBookTitle: nextStep.book.title } : null;
  });

  const myRoadmap = await getMyRoadmapDto(user.id, userRoadmapId);

  // 通知は commit 後に送る (rollback されたのに通知だけ飛ぶことを防ぐ)
  if (event?.type === "ROADMAP_COMPLETED") {
    await notificationService.notifyRoadmapCompleted({
      userId: user.id,
      roadmapSlug: myRoadmap.roadmap.slug,
      roadmapTitle: myRoadmap.roadmap.title,
    });
  } else if (event?.type === "NEXT_STEP_AVAILABLE") {
    await notificationService.notifyNextStepAvailable({
      userId: user.id,
      roadmapSlug: myRoadmap.roadmap.slug,
      nextBookTitle: event.nextBookTitle,
    });
  }

  return myRoadmap;
}
