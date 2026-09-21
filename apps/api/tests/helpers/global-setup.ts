import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";
import { TEST_DATABASE_URL } from "./test-database-url";

// テスト実行前に 1 回だけ動く: テスト用 DB を (無ければ) 作成し、migration を適用する。
export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const databaseName = url.pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(databaseName) || !databaseName.includes("test")) {
    throw new Error(`Refusing to run tests against database "${databaseName}"`);
  }

  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  const existing = await admin.query("select 1 from pg_database where datname = $1", [
    databaseName,
  ]);
  if (existing.rowCount === 0) await admin.query(`create database "${databaseName}"`);
  await admin.end();

  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
}
