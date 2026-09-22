import { getTableName, is, Table } from "drizzle-orm";
import { Pool } from "pg";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import * as schema from "./schema";

// 読み取り専用の接続・テーブル存在確認。データや接続文字列は出力しない。
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000,
});

try {
  const expected = Object.values(schema)
    .filter((value) => is(value, Table))
    .map((table) => getTableName(table));
  const result = await pool.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name = any($1::text[])`,
    [expected],
  );
  const present = new Set(result.rows.map((row) => row.table_name));
  const missing = expected.filter((name) => !present.has(name));
  if (missing.length > 0) {
    logger.error("Database connected, but application tables are missing. Run db:migrate.", {
      missing,
    });
    process.exitCode = 1;
  } else {
    logger.info("Database connected; all application tables exist.", { tables: expected.length });
  }
} catch {
  logger.error("Database check failed. Check DATABASE_URL, network access and TLS settings.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
