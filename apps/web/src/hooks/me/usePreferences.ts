import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/api/client";

export const preferencesKey = ["me", "preferences"] as const;

/** GET /me/preferences。興味のあるカテゴリ・メインの Roadmap・オンボーディング完了 */
export function usePreferences() {
  return useQuery({ queryKey: preferencesKey, queryFn: () => unwrap(api.me.preferences.$get()) });
}

type PreferenceInput = Parameters<typeof api.me.preferences.$patch>[0]["json"];

/** PATCH /me/preferences。送った項目だけ変わる */
export function useUpdatePreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (json: PreferenceInput) => unwrap(api.me.preferences.$patch({ json })),
    onSuccess: (preferences) => client.setQueryData(preferencesKey, preferences),
  });
}
