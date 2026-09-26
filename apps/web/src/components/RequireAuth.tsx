import { Navigate, Outlet, useLocation } from "react-router";
import { useMe } from "@/hooks/useMe";
import { ErrorMessage, Loading, Page } from "./ui";

/** 未ログインなら /login へ、username 未確定なら /onboarding へ送る */
export function RequireAuth() {
  const { data: me, isPending, error, refetch } = useMe();
  const location = useLocation();
  if (isPending) return <Loading />;
  if (error) return <Page><ErrorMessage error={error} onRetry={() => refetch()} /></Page>;
  if (!me) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!me.usernameConfirmed && location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
