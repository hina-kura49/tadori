import { existsSync } from "node:fs";
import { z } from "zod";

// 環境変数の読み込みと検証はこのファイルだけで行う。
// 他のファイルは process.env を直接読まず、必ず `env` を import する。

// 既に設定済みの変数は上書きされない (テストや本番の設定が優先される)
if (existsSync(".env")) process.loadEnvFile(".env");

/** 未設定・空文字は undefined として扱う */
const optionalString = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalBoolean = optionalString.pipe(z.enum(["true", "false"]).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  DATABASE_MIGRATION_URL: optionalString,
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  CORS_ORIGIN: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  APP_SCHEME: z.string().min(1).default("tadori"),
  EXPO_ACCESS_TOKEN: optionalString,
  LOG_LEVEL: optionalString.pipe(
    z.enum(["debug", "info", "warn", "error", "silent"]).optional(),
  ),

  // --- ログイン方式 -----------------------------------------------------------
  // メール + パスワード。未指定なら production では無効、それ以外では有効
  // (本番の画面は Apple / Google のみ。seed・テスト・開発用に残している)
  AUTH_EMAIL_PASSWORD_ENABLED: optionalBoolean,
  // Google: カンマ区切りで複数指定できる (Web / iOS / Android の client ID)。先頭が Web 用
  GOOGLE_CLIENT_ID: optionalString.transform((value) =>
    value
      ?.split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  ),
  GOOGLE_CLIENT_SECRET: optionalString,
  // Apple: APPLE_CLIENT_ID は Service ID、APPLE_APP_BUNDLE_IDENTIFIER は iOS アプリの bundle ID
  APPLE_CLIENT_ID: optionalString,
  APPLE_CLIENT_SECRET: optionalString,
  APPLE_APP_BUNDLE_IDENTIFIER: optionalString,
});

type ParsedEnv = z.infer<typeof envSchema>;
export type Env = Omit<ParsedEnv, "AUTH_EMAIL_PASSWORD_ENABLED"> & {
  AUTH_EMAIL_PASSWORD_ENABLED: boolean;
};

function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    ...process.env,
    // Renderが割り当てたHTTPS URLを使う。独自ドメインは明示設定を優先。
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || process.env.RENDER_EXTERNAL_URL,
  });
  if (!parsed.success) {
    // 値そのものは出力しない (secret が混ざるため)。キーと理由だけ出す。
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${problems}`);
  }
  const data = parsed.data;
  return {
    ...data,
    AUTH_EMAIL_PASSWORD_ENABLED:
      data.AUTH_EMAIL_PASSWORD_ENABLED === undefined
        ? data.NODE_ENV !== "production"
        : data.AUTH_EMAIL_PASSWORD_ENABLED === "true",
  };
}

export const env = loadEnv();
