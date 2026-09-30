import { RequireAuth } from "@/components/RequireAuth";

// ログインが必要な画面の入口。未ログインなら /login、username 未確定なら /onboarding へ送る
export default RequireAuth;
