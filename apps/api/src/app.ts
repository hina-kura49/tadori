import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./lib/env";
import { handleError, handleNotFound } from "./middleware/error-handler";
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
// Rate Limit を入れる場合はここに追加する (例: hono-rate-limiter)。
//   app.use("/api/auth/*", authRateLimiter);
//   app.use(defaultRateLimiter);

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
