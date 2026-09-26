import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./lib/env";
import { handleError, handleNotFound } from "./middleware/error-handler";
import { rateLimit } from "./middleware/rate-limit";
import { requestLogger } from "./middleware/request-logger";
import { authRoutes } from "./routes/auth";
import { booksRoutes } from "./routes/books";
import { circlesRoutes } from "./routes/circles";
import { meRoutes } from "./routes/me";
import { roadmapsRoutes } from "./routes/roadmaps";
import { usersRoutes } from "./routes/users";

const app = new Hono();

// --- 全 route 共通の middleware ---------------------------------------------
app.use(requestLogger);
app.use(secureHeaders());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["set-auth-token"], // Bearer token (Better Auth の bearer plugin)
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);
// ログインと新規登録は同じ IP から 1 分に 10 回まで (パスワードの総当たり対策)。
// テストは 1 ファイルで何十人も signup するので外す (middleware 自体は rate-limit.test.ts で確認)
if (env.NODE_ENV !== "test") {
  const authRateLimiter = rateLimit({ windowMs: 60_000, limit: 10 });
  app.use("/api/auth/sign-in/*", authRateLimiter);
  app.use("/api/auth/sign-up/*", authRateLimiter);
}

app.onError(handleError);
app.notFound(handleNotFound);

app.get("/health", (c) => c.json({ status: "ok" }, 200));
app.route("/api/auth", authRoutes);

// --- API routes -------------------------------------------------------------
// Hono RPC の型はここから作られる。route を足すときは必ずこのチェーンに追加する。
const routes = app
  .route("/users", usersRoutes)
  .route("/books", booksRoutes)
  .route("/roadmaps", roadmapsRoutes)
  .route("/me", meRoutes)
  .route("/circles", circlesRoutes);

export type AppType = typeof routes;
export { app };
