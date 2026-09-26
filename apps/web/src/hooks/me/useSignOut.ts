import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { api, unwrap } from "@/api/client";
import { signOut } from "@/lib/auth";

/** ログアウト / アカウント削除のあと、手元のデータを捨ててログイン画面へ */
export function useLeave() {
  const client = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (action: "signout" | "delete") => {
      if (action === "signout") return void (await signOut());
      await unwrap(api.me.index.$delete());
    },
    onSuccess: () => {
      client.clear();
      navigate("/login", { replace: true });
    },
  });
}
