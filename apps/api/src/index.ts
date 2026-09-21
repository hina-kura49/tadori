import { serve } from "@hono/node-server";
import { app } from "./app";
import { pool } from "./db/client";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler";

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info("Tadori API started", { port: info.port, env: env.NODE_ENV });
});
const stopScheduler = startScheduler();

function shutdown(signal: string) {
  logger.info("Shutting down", { signal });
  stopScheduler();
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
