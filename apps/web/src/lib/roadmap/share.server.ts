import { ApiError, unwrap } from "@/api/client";
import { apiOrigin } from "@/lib/api-origin.server";
import type { RoadmapDetail } from "@/hooks/roadmap/queries";
import { createApiClient } from "@tadori/api/client";

// 共有リンク (/r/:slug) の HTML をサーバーで作るときに、ロードマップを API から直接取る。

/**
 * これ以上待たずに、ブラウザでの取得に任せる時間。
 * Render の無料プランは休止明けの最初の応答に数十秒かかるので、そのあいだ真っ白な画面にしない。
 */
const TIMEOUT_MS = 5_000;

export type SharedRoadmapResult =
  | { status: "found"; roadmap: RoadmapDetail }
  | { status: "not-found" }
  /** API が休止中・障害中。画面はブラウザで取り直す */
  | { status: "unavailable" };

/** cookie: 閲覧者の Cookie。作成者本人なら非公開の道も見え、自分の進み具合も入る */
export async function fetchSharedRoadmap(slug: string, cookie: string | null): Promise<SharedRoadmapResult> {
  const origin = apiOrigin();
  if (!origin) return { status: "unavailable" };
  const api = createApiClient(origin, {
    headers: cookie ? { cookie } : {},
    init: { signal: AbortSignal.timeout(TIMEOUT_MS) },
  });
  try {
    const roadmap = await unwrap(api.roadmaps[":slug"].$get({ param: { slug } }));
    return { status: "found", roadmap };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { status: "not-found" };
    return { status: "unavailable" };
  }
}
