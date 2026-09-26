import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// src/lib/env.ts と同じく、ENV_FILE で読むファイルを切り替えられる
const envFile = process.env.ENV_FILE ?? ".env";
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL || "",
  },
});
