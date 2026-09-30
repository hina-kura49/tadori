import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, unwrap } from "@/api/client";
import { dashboardKey } from "@/hooks/me/useDashboard";
import type { Category } from "@/lib/roadmap/labels";

// ロードマップ・本まわりのデータ取得。型は Hono RPC から推論される。

export const roadmapKeys = {
  all: ["roadmaps"] as const,
  list: (filters: { q?: string; category?: Category }) => ["roadmaps", "list", filters] as const,
  detail: (slug: string) => ["roadmaps", "detail", slug] as const,
};
export const bookKeys = {
  detail: (id: string) => ["books", "detail", id] as const,
  search: (q: string) => ["books", "search", q] as const,
};

/** 公開ロードマップ一覧。「もっと見る」で次のページを読む (cursor ページング) */
export function useRoadmapList(filters: { q?: string; category?: Category }) {
  return useInfiniteQuery({
    queryKey: roadmapKeys.list(filters),
    queryFn: ({ pageParam }) =>
      unwrap(
        api.roadmaps.index.$get({
          query: {
            ...(filters.q ? { q: filters.q } : {}),
            ...(filters.category ? { category: filters.category } : {}),
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

const fetchRoadmap = (slug: string) => unwrap(api.roadmaps[":slug"].$get({ param: { slug } }));
export type RoadmapDetail = Awaited<ReturnType<typeof fetchRoadmap>>;

/** initialData: サーバーで取得済みのデータ (/r/:slug の loader)。あればそれを最初の表示に使う */
export function useRoadmap(slug: string, options?: { enabled?: boolean; initialData?: RoadmapDetail }) {
  return useQuery({
    queryKey: roadmapKeys.detail(slug),
    enabled: options?.enabled ?? true,
    initialData: options?.initialData,
    queryFn: () => fetchRoadmap(slug),
  });
}
export type RoadmapStep = RoadmapDetail["steps"][number];
export type RoadmapSummary = NonNullable<
  ReturnType<typeof useRoadmapList>["data"]
>["pages"][number]["items"][number];

export function useBook(id: string) {
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: () => unwrap(api.books[":id"].$get({ param: { id } })),
  });
}

export function useBookSearch(q: string) {
  return useQuery({
    queryKey: bookKeys.search(q),
    queryFn: () => unwrap(api.books.index.$get({ query: q ? { q } : {} })),
  });
}

/** 学習を始める。すでに開始済みならそのまま成功扱いにする */
export function useStartRoadmap(slug: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (roadmapId: string) => {
      try {
        await unwrap(api.roadmaps[":id"].start.$post({ param: { id: roadmapId } }));
      } catch (error) {
        if (error instanceof ApiError && error.code === "ROADMAP_ALREADY_STARTED") return;
        throw error;
      }
    },
    onSuccess: () => invalidateProgress(client, slug),
  });
}

/** 一時停止・再開 */
export function useSetRoadmapStatus(slug: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userRoadmapId, status }: { userRoadmapId: string; status: "IN_PROGRESS" | "PAUSED" }) =>
      unwrap(api.me.roadmaps[":userRoadmapId"].$patch({ param: { userRoadmapId }, json: { status } })),
    onSuccess: () => invalidateProgress(client, slug),
  });
}

/** 1 冊ぶんの進み具合を 0〜100% で保存する。100% で完了扱い */
export function useSaveStepProgress(slug: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userRoadmapId, stepId, percentage }: { userRoadmapId: string; stepId: string; percentage: number }) => {
      if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100)
        throw new Error("進捗は 0〜100 の整数で入力してください。");
      return unwrap(
        api.me.roadmaps[":userRoadmapId"].steps[":stepId"].$patch({
          param: { userRoadmapId, stepId },
          json: {
            status: percentage === 100 ? "COMPLETED" : "READING",
            progressType: "PERCENTAGE",
            progressValue: String(percentage),
          },
        }),
      );
    },
    onSuccess: () => invalidateProgress(client, slug),
  });
}

// 進捗が変わると、詳細と Today (dashboard) の表示が古くなる
function invalidateProgress(client: ReturnType<typeof useQueryClient>, slug: string) {
  return Promise.all([
    client.invalidateQueries({ queryKey: roadmapKeys.detail(slug) }),
    client.invalidateQueries({ queryKey: dashboardKey }),
  ]);
}
