import { migrate } from "drizzle-orm/node-postgres/migrator";
import { logger } from "../lib/logger";
import { db, pool } from "./client";

// `pnpm db:migrate` で実行する。drizzle/ 配下の SQL を順に適用する。
await migrate(db, { migrationsFolder: "./drizzle" });
logger.info("Migrations applied");
await pool.end();
