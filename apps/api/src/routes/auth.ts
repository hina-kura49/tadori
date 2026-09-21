import { Hono } from "hono";
import { auth, enabledLoginMethods } from "../lib/auth";

// Better Auth の handler をそのままマウントする (signup / signin / signout / session)。
// エンドポイント一覧は src/lib/auth.ts の冒頭コメントを参照。
// RPC の対象外: モバイルは Better Auth の公式クライアント (@better-auth/expo) を使う。
//
// GET /api/auth/methods だけは Tadori 独自: ログイン画面がどのボタンを出すかを決めるために使う。
export const authRoutes = new Hono()
  .get("/methods", (c) => c.json(enabledLoginMethods, 200))
  .on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw));
