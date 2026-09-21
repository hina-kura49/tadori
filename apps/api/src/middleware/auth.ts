import { createMiddleware } from "hono/factory";
import { auth } from "../lib/auth";
import { unauthorized } from "../lib/errors";
import type { AuthEnv, AuthUser, ViewerEnv } from "../types/app";

// 認証 Middleware。Route は「誰がリクエストしたか」をここ経由でしか取得しない。
//
//   requireAuth  : 未ログインなら 401。`c.get("user")` で AuthUser を得る
//   optionalAuth : 未ログインでも通す。`c.get("viewer")` は AuthUser | null

async function resolveAuthUser(headers: Headers): Promise<AuthUser | null> {
  const session = await auth.api.getSession({ headers });
  // username は DB では NOT NULL (signup 時の hook が必ず埋める)。型の上でだけ任意になっている
  if (!session || !session.user.username) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    username: session.user.username,
  };
}

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const user = await resolveAuthUser(c.req.raw.headers);
  if (!user) throw unauthorized();
  c.set("user", user);
  await next();
});

export const optionalAuth = createMiddleware<ViewerEnv>(async (c, next) => {
  c.set("viewer", await resolveAuthUser(c.req.raw.headers));
  await next();
});
