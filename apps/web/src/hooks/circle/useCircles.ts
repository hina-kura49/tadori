import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/api/client";

export const circleKeys = {
  mine: ["circles", "mine"] as const,
  public: ["circles", "public"] as const,
  detail: (id: string) => ["circles", "detail", id] as const,
};

/** 自分が参加しているサークル */
export const useMyCircles = () =>
  useQuery({ queryKey: circleKeys.mine, queryFn: () => unwrap(api.me.circles.$get()) });

/** 公開サークル (新しい順) */
export const usePublicCircles = () =>
  useQuery({
    queryKey: circleKeys.public,
    queryFn: () => unwrap(api.circles.index.$get({ query: { limit: "20" } })),
  });

export const useCircle = (id: string) =>
  useQuery({
    queryKey: circleKeys.detail(id),
    queryFn: () => unwrap(api.circles[":id"].$get({ param: { id } })),
  });

/** 参加・退出・招待・予定の追加・削除。成功したらサークル関連のキャッシュを捨てる */
export function useCircleActions(id: string) {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ["circles"] });
  const param = { id };
  return {
    join: useMutation({ mutationFn: () => unwrap(api.circles[":id"].join.$post({ param })), onSuccess }),
    leave: useMutation({ mutationFn: () => unwrap(api.circles[":id"].leave.$post({ param })), onSuccess }),
    invite: useMutation({
      mutationFn: (username: string) =>
        unwrap(api.circles[":id"].invites.$post({ param, json: { username } })),
      onSuccess,
    }),
    addSchedule: useMutation({
      mutationFn: (json: { title: string; scheduledAt: string; description?: string | null }) =>
        unwrap(api.circles[":id"].schedules.$post({ param, json })),
      onSuccess,
    }),
    deleteSchedule: useMutation({
      mutationFn: (scheduleId: string) =>
        unwrap(api.circles[":id"].schedules[":scheduleId"].$delete({ param: { id, scheduleId } })),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: () => unwrap(api.circles[":id"].$delete({ param })), onSuccess }),
  };
}
