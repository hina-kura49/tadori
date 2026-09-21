import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repository } from "@/api/repository";
export const dataKey = ["tadori", "dashboard"];
export function useTadori() {
  return useQuery({
    queryKey: dataKey,
    queryFn: repository.getDashboard,
    staleTime: 30000,
    retry: 1,
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
