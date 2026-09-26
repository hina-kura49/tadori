import { useQuery } from "@tanstack/react-query";
import { api, ApiError, unwrap } from "@/api/client";

export const meKey = ["me"] as const;

/** ログイン中のユーザー。未ログインなら null */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async () => {
      try {
        return await unwrap(api.me.index.$get());
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
  });
}
