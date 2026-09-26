import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./tests/helpers/test-database-url.ts";

// テストは実 PostgreSQL (tadori_test) に対して実行する。
// DB を共有するためファイル並列実行は無効化している。
// 接続先は TEST_DATABASE_URL で上書きできる (既定: docker compose の DB の tadori_test)。

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/helpers/global-setup.ts"],
    setupFiles: ["tests/helpers/setup.ts"],
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-1234",
      BETTER_AUTH_URL: "http://localhost:4000",
      CORS_ORIGIN: "http://localhost:8081",
      PROXY_SHARED_SECRET: "test-proxy-secret",
    },
  },
});
