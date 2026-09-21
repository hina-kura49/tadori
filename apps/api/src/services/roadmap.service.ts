import { db } from "../db/client";
import {
  type RoadmapDetailDto,
  type RoadmapStepDto,
  type RoadmapSummaryDto,
  toRoadmapStepDto,
  toRoadmapSummaryDto,
} from "../dto/roadmap.dto";
import { isUniqueViolation } from "../lib/db-errors";
import { badRequest, notFound } from "../lib/errors";
import { buildPage, decodeCursor, type Page } from "../lib/pagination";
import { generateSlug } from "../lib/slug";
import { assertCanEditRoadmap, assertCanViewRoadmap } from "../policies/roadmap.policy";
import * as bookRepository from "../repositories/book.repository";
import * as roadmapRepository from "../repositories/roadmap.repository";
import type {
  CreateRoadmapInput,
  CreateStepInput,
  ListRoadmapsQuery,
  ReorderStepsInput,
  UpdateRoadmapInput,
  UpdateStepInput,
} from "../schemas/roadmap.schema";
import type { AuthUser } from "../types/app";
import * as progressService from "./progress.service";

const SLUG_MAX_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

/** GET /roadmaps — PUBLIC のみ。UNLISTED / PRIVATE は一覧に出さない */
export async function listPublicRoadmaps(
  query: ListRoadmapsQuery,
): Promise<Page<RoadmapSummaryDto>> {
  const rows = await roadmapRepository.listRoadmapSummaries({
    visibility: "PUBLIC",
    q: query.q,
    category: query.category,
    difficulty: query.difficulty,
    creatorUsername: query.creator,
    cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
    limit: query.limit + 1,
  });
  const page = buildPage(rows, query.limit);
  return { items: page.items.map(toRoadmapSummaryDto), nextCursor: page.nextCursor };
}

/** 自分が作成した Roadmap (visibility を問わない) */
export async function listRoadmapsCreatedBy(
  creatorId: string,
  options: { publicOnly: boolean; limit: number },
): Promise<RoadmapSummaryDto[]> {
  const rows = await roadmapRepository.listRoadmapSummaries({
    creatorId,
    visibility: options.publicOnly ? "PUBLIC" : undefined,
    limit: options.limit,
  });
  return rows.map(toRoadmapSummaryDto);
}

async function buildRoadmapDetail(
  roadmapId: string,
  viewer: AuthUser | null,
): Promise<RoadmapDetailDto> {
  const [summary, steps, userProgress] = await Promise.all([
    roadmapRepository.findRoadmapSummaryById(roadmapId),
    roadmapRepository.listSteps(roadmapId),
    viewer ? progressService.getUserProgress(viewer.id, roadmapId) : null,
  ]);
  if (!summary) throw notFound("ROADMAP_NOT_FOUND", "Roadmap not found");

  return { ...toRoadmapSummaryDto(summary), steps: steps.map(toRoadmapStepDto), userProgress };
}

/** GET /roadmaps/:slug */
export async function getRoadmapBySlug(
  slug: string,
  viewer: AuthUser | null,
): Promise<RoadmapDetailDto> {
  const roadmap = await roadmapRepository.findRoadmapBySlug(slug);
  assertCanViewRoadmap(roadmap, viewer?.id ?? null);
  return buildRoadmapDetail(roadmap.id, viewer);
}

export async function createRoadmap(
  user: AuthUser,
  input: CreateRoadmapInput,
): Promise<RoadmapDetailDto> {
  // slug は title + ランダム suffix。万一衝突したら作り直す
  for (let attempt = 1; ; attempt++) {
    try {
      const roadmap = await roadmapRepository.insertRoadmap({
        ...input,
        creatorId: user.id,
        slug: generateSlug(input.title),
      });
      return buildRoadmapDetail(roadmap.id, user);
    } catch (error) {
      if (isUniqueViolation(error) && attempt < SLUG_MAX_ATTEMPTS) continue;
      throw error;
    }
  }
}

/** slug は共有 URL に使われるため、title を変えても変更しない */
export async function updateRoadmap(
  user: AuthUser,
  roadmapId: string,
  input: UpdateRoadmapInput,
): Promise<RoadmapDetailDto> {
  const roadmap = await roadmapRepository.findRoadmapById(roadmapId);
  assertCanEditRoadmap(roadmap, user.id);

  await roadmapRepository.updateRoadmap(roadmapId, input);
  return buildRoadmapDetail(roadmapId, user);
}

export async function deleteRoadmap(user: AuthUser, roadmapId: string): Promise<void> {
  const roadmap = await roadmapRepository.findRoadmapById(roadmapId);
  assertCanEditRoadmap(roadmap, user.id);

  await roadmapRepository.deleteRoadmap(roadmapId);
}

// ---------------------------------------------------------------------------
// RoadmapStep
// ---------------------------------------------------------------------------

async function listStepDtos(roadmapId: string): Promise<RoadmapStepDto[]> {
  const steps = await roadmapRepository.listSteps(roadmapId);
  return steps.map(toRoadmapStepDto);
}

async function assertBookExists(bookId: string): Promise<void> {
  const book = await bookRepository.findBookById(bookId);
  if (!book) throw notFound("BOOK_NOT_FOUND", "Book not found");
}

/** Step 系の API は、変更後の全 Step (position 順) を返す */
export async function addStep(
  user: AuthUser,
  roadmapId: string,
  input: CreateStepInput,
): Promise<RoadmapStepDto[]> {
  const roadmap = await roadmapRepository.findRoadmapById(roadmapId);
  assertCanEditRoadmap(roadmap, user.id);
  await assertBookExists(input.bookId);

  await db.transaction(async (tx) => {
    await roadmapRepository.lockRoadmap(roadmapId, tx);
    await roadmapRepository.appendStep({ ...input, roadmapId }, tx);
  });
  return listStepDtos(roadmapId);
}

export async function updateStep(
  user: AuthUser,
  roadmapId: string,
  stepId: string,
  input: UpdateStepInput,
): Promise<RoadmapStepDto[]> {
  const roadmap = await roadmapRepository.findRoadmapById(roadmapId);
  assertCanEditRoadmap(roadmap, user.id);

  const step = await roadmapRepository.findStep(roadmapId, stepId);
  if (!step) throw notFound("ROADMAP_STEP_NOT_FOUND", "Step not found");
  if (input.bookId) await assertBookExists(input.bookId);

  await roadmapRepository.updateStep(stepId, input);
  return listStepDtos(roadmapId);
}

export async function deleteStep(
  user: AuthUser,
  roadmapId: string,
  stepId: string,
): Promise<RoadmapStepDto[]> {
  const roadmap = await roadmapRepository.findRoadmapById(roadmapId);
  assertCanEditRoadmap(roadmap, user.id);

  await db.transaction(async (tx) => {
    await roadmapRepository.lockRoadmap(roadmapId, tx);
    const step = await roadmapRepository.findStep(roadmapId, stepId, tx);
    if (!step) throw notFound("ROADMAP_STEP_NOT_FOUND", "Step not found");
    await roadmapRepository.deleteStepAndCompact(step, tx);
  });
  return listStepDtos(roadmapId);
}

/**
 * PATCH /roadmaps/:id/steps/reorder
 *
 * body には Roadmap の「全 Step」を重複なく含める必要がある。
 * position は相対順序としてだけ使い、保存時に 1..n へ振り直す。
 */
export async function reorderSteps(
  user: AuthUser,
  roadmapId: string,
  input: ReorderStepsInput,
): Promise<RoadmapStepDto[]> {
  const roadmap = await roadmapRepository.findRoadmapById(roadmapId);
  assertCanEditRoadmap(roadmap, user.id);

  const requestedStepIds = new Set(input.steps.map((step) => step.stepId));
  const requestedPositions = new Set(input.steps.map((step) => step.position));
  if (
    requestedStepIds.size !== input.steps.length ||
    requestedPositions.size !== input.steps.length
  ) {
    throw badRequest("INVALID_STEP_ORDER", "stepId and position must be unique");
  }

  await db.transaction(async (tx) => {
    await roadmapRepository.lockRoadmap(roadmapId, tx);

    const currentSteps = await roadmapRepository.listSteps(roadmapId, tx);
    const coversAllSteps =
      currentSteps.length === requestedStepIds.size &&
      currentSteps.every((step) => requestedStepIds.has(step.id));
    if (!coversAllSteps) {
      throw badRequest("INVALID_STEP_ORDER", "steps must include every step of the roadmap");
    }

    const normalized = input.steps
      .toSorted((a, b) => a.position - b.position)
      .map((step, index) => ({ stepId: step.stepId, position: index + 1 }));
    await roadmapRepository.applyStepPositions(roadmapId, normalized, tx);
  });
  return listStepDtos(roadmapId);
}
