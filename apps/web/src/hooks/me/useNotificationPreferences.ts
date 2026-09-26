import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/api/client";

const key = ["me", "notification-preferences"] as const;
type Input = Parameters<(typeof api.me)["notification-preferences"]["$patch"]>[0]["json"];

export function useNotificationPreferences() {
  return useQuery({ queryKey: key, queryFn: () => unwrap(api.me["notification-preferences"].$get()) });
}

export function useUpdateNotificationPreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (json: Input) => unwrap(api.me["notification-preferences"].$patch({ json })),
    onSuccess: (preferences) => client.setQueryData(key, preferences),
  });
}
