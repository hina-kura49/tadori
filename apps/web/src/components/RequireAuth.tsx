import { Navigate, Outlet, useLocation } from "react-router";
import { useMe } from "@/hooks/useMe";
import { ErrorMessage, Loading, Page } from "./ui";

/** 未ログインなら /login へ、username 未確定なら /onboarding へ送る (確定済みなら /onboarding は開かせない) */
export function RequireAuth() {
  const { data: me, isPending, error, refetch } = useMe();
  const location = useLocation();
  if (isPending) return <Loading />;
  if (error) return <Page><ErrorMessage error={error} onRetry={() => refetch()} /></Page>;
  if (!me) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  const onOnboarding = location.pathname === "/onboarding";
  if (!me.usernameConfirmed && !onOnboarding) return <Navigate to="/onboarding" replace />;
  if (me.usernameConfirmed && onOnboarding) return <Navigate to="/" replace />;
  return <Outlet />;
}
