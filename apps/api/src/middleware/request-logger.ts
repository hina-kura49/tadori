import { createMiddleware } from "hono/factory";
import { logger } from "../lib/logger";

// method / path / status / 所要時間だけを記録する。
// header・cookie・body・query は記録しない (token や個人情報が含まれるため)。
export const requestLogger = createMiddleware(async (c, next) => {
  const startedAt = performance.now();
  await next();
  logger.info("request", {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Math.round(performance.now() - startedAt),
  });
});
