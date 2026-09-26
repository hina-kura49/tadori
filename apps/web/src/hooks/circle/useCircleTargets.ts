import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/api/client";
import { circleKeys } from "./useCircles";

/** サークルの対象に選べるロードマップ: 自分が辿っているもの + 公開されているもの */
export function useRoadmapChoices() {
  return useQuery({
    queryKey: ["circles", "roadmap-choices"],
    queryFn: async () => {
      const [mine, open] = await Promise.all([
        unwrap(api.me.roadmaps.$get({ query: {} })),
        unwrap(api.roadmaps.index.$get({ query: { limit: "50" } })),
      ]);
      const seen = new Set<string>();
      return [
        ...mine.items.map((m) => ({ id: m.roadmap.id, title: m.roadmap.title, note: "辿っている" })),
        ...open.items.map((r) => ({ id: r.id, title: r.title, note: `${r.creator.name} · ${r.stepCount}冊` })),
      ].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    },
  });
}

/** 登録済みの本をタイトルなどで検索する */
export function useBookSearch(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: ["circles", "book-search", query],
    queryFn: () => unwrap(api.books.index.$get({ query: query ? { q: query, limit: "20" } : { limit: "20" } })),
    placeholderData: keepPreviousData,
  });
}

type CreateCircleJson = Parameters<typeof api.circles.index.$post>[0]["json"];

export function useCreateCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (json: CreateCircleJson) => unwrap(api.circles.index.$post({ json })),
    onSuccess: () => qc.invalidateQueries({ queryKey: circleKeys.mine }),
  });
}
