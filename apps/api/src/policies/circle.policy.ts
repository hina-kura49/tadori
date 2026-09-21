import type { CircleMemberRole, CircleVisibility } from "../db/schema";
import { forbidden, notFound } from "../lib/errors";

// Circle に関する認可ルールはすべてこのファイルに置く。

type CircleAccess = { visibility: CircleVisibility };

/** Circle に対するリクエスト User の立場。Service が DB から組み立てて渡す */
export type CircleViewerContext = {
  role: CircleMemberRole | null; // null = メンバーではない
  isInvited: boolean;
};

/**
 * PUBLIC      : 誰でも閲覧可 (メンバー一覧・Schedule を含む)
 * INVITE_ONLY : メンバー、または招待された User のみ
 */
export function canViewCircle(circle: CircleAccess, viewer: CircleViewerContext): boolean {
  if (circle.visibility === "PUBLIC") return true;
  return viewer.role !== null || viewer.isInvited;
}

/** 閲覧不可のときは存在自体を隠すため 404 を返す */
export function assertCanViewCircle(
  circle: CircleAccess | null,
  viewer: CircleViewerContext,
): asserts circle is CircleAccess {
  if (!circle || !canViewCircle(circle, viewer)) {
    throw notFound("CIRCLE_NOT_FOUND", "Circle not found");
  }
}

/** Circle の更新・削除・招待・Schedule の編集は OWNER のみ */
export function assertCircleOwner(
  circle: CircleAccess | null,
  viewer: CircleViewerContext,
): asserts circle is CircleAccess {
  assertCanViewCircle(circle, viewer);
  if (viewer.role !== "OWNER") {
    throw forbidden("Only the circle owner can perform this action");
  }
}

/** PUBLIC は誰でも参加可。INVITE_ONLY は招待された User のみ */
export function canJoinCircle(circle: CircleAccess, viewer: CircleViewerContext): boolean {
  return circle.visibility === "PUBLIC" || viewer.isInvited;
}
