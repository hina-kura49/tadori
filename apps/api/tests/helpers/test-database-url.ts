// vitest.config.ts と global-setup.ts の両方から使う
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://tadori:tadori@localhost:55432/tadori_test";
