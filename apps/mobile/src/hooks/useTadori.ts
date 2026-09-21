import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repository } from "@/api/repository";
import { isAuthError } from "@/api/client";
export const dataKey = ["tadori", "dashboard"];
export function useTadori() {
  return useQuery({
    queryKey: dataKey,
    queryFn: repository.getDashboard,
    staleTime: 30000,
    // 未ログイン (401) は再試行しても変わらない。_layout がログイン画面へ誘導する
    retry: (count, error) => !isAuthError(error) && count < 1,
  });
}
export function useAction<T, R>(fn: (input: T) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: dataKey });
    },
  });
}
