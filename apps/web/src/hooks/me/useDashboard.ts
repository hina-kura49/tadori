import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/api/client";
import { meKey } from "@/hooks/useMe";

export const dashboardKey = ["me", "dashboard"] as const;

const fetchDashboard = () => unwrap(api.me.dashboard.$get());
export type Dashboard = Awaited<ReturnType<typeof fetchDashboard>>;
export type DashboardRoadmap = Dashboard["roadmaps"][number];
export type DashboardUserRoadmap = Dashboard["userRoadmaps"][number];
export type StepProgress = DashboardUserRoadmap["steps"][number];

/** GET /me/dashboard。Today・Me など「自分に関係するデータ一式」 */
export function useDashboard() {
  return useQuery({ queryKey: dashboardKey, queryFn: fetchDashboard });
}

type StepProgressInput = Parameters<
  (typeof api.me.roadmaps)[":userRoadmapId"]["steps"][":stepId"]["$patch"]
>[0]["json"];

/** 1 冊分の進捗を更新する。成功したら dashboard を取り直す */
export function useUpdateStepProgress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { userRoadmapId: string; stepId: string; json: StepProgressInput }) =>
      unwrap(
        api.me.roadmaps[":userRoadmapId"].steps[":stepId"].$patch({
          param: { userRoadmapId: input.userRoadmapId, stepId: input.stepId },
          json: input.json,
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: dashboardKey }),
  });
}

/** ロードマップの一時停止・再開 */
export function useUpdateRoadmapStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { userRoadmapId: string; status: "IN_PROGRESS" | "PAUSED" }) =>
      unwrap(
        api.me.roadmaps[":userRoadmapId"].$patch({
          param: { userRoadmapId: input.userRoadmapId },
          json: { status: input.status },
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: dashboardKey }),
  });
}

type UpdateMeInput = Parameters<typeof api.me.index.$patch>[0]["json"];

/** PATCH /me。成功したら me と dashboard を取り直す */
export function useUpdateMe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (json: UpdateMeInput) => unwrap(api.me.index.$patch({ json })),
    onSuccess: async (user) => {
      client.setQueryData(meKey, user);
      await client.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}
