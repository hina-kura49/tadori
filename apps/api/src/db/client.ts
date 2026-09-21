import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../lib/env";
import * as schema from "./schema";

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Repository 関数が受け取る「DB 実行主体」。
 * 通常は `db`、Service が transaction を張っているときは `tx` を渡す。
 */
export type DbExecutor = Database | Transaction;
