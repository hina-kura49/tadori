import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../lib/env";
import { logger } from "../lib/logger";

// `pnpm db:migrate` で実行する。drizzle/ 配下の SQL を順に適用する。
const pool = new Pool({
  connectionString: env.DATABASE_MIGRATION_URL ?? env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
});
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  logger.info("Migrations applied");
} catch {
  // 接続文字列や SQL 内のデータをエラーログへ流さない。
  logger.error("Migration failed. Check database access and migration compatibility.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
