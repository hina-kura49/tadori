import type { RoadmapVisibility } from "../db/schema";
import { forbidden, notFound } from "../lib/errors";

// Roadmap / UserRoadmap に関する認可ルールはすべてこのファイルに置く。
// Service は「assert〜」を呼ぶだけにして、条件式を各所に重複させない。

type RoadmapAccess = { creatorId: string; visibility: RoadmapVisibility };

/**
 * PUBLIC   : 誰でも閲覧可
 * UNLISTED : URL (slug) を知っていれば閲覧可。一覧には出さない
 * PRIVATE  : creator のみ
 */
export function canViewRoadmap(roadmap: RoadmapAccess, viewerId: string | null): boolean {
  if (roadmap.visibility !== "PRIVATE") return true;
  return roadmap.creatorId === viewerId;
}

/** 閲覧不可のときは存在自体を隠すため 403 ではなく 404 を返す */
export function assertCanViewRoadmap(
  roadmap: RoadmapAccess | null,
  viewerId: string | null,
): asserts roadmap is RoadmapAccess {
  if (!roadmap || !canViewRoadmap(roadmap, viewerId)) {
    throw notFound("ROADMAP_NOT_FOUND", "Roadmap not found");
  }
}

/** Roadmap と Step の作成・編集・削除・並べ替えは creator のみ */
export function assertCanEditRoadmap(
  roadmap: RoadmapAccess | null,
  userId: string,
): asserts roadmap is RoadmapAccess {
  assertCanViewRoadmap(roadmap, userId);
  if (roadmap.creatorId !== userId) {
    throw forbidden("You are not allowed to edit this roadmap");
  }
}

/** UserRoadmap と Step Progress は本人のみ。他人のものは存在を隠す (404) */
export function assertOwnsUserRoadmap(
  userRoadmap: { userId: string } | null,
  userId: string,
): asserts userRoadmap is { userId: string } {
  if (!userRoadmap || userRoadmap.userId !== userId) {
    throw notFound("USER_ROADMAP_NOT_FOUND", "User roadmap not found");
  }
}
