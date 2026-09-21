import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { bearer } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, sessions, users, verifications } from "../db/schema";
import { usernameSchema } from "../schemas/common.schema";
import { env } from "./env";
import { logger } from "./logger";
import { generateProvisionalUsername } from "./username";

// Better Auth の設定。/api/auth/* のエンドポイントはここから自動生成される。
//
//   POST /api/auth/sign-in/social  { provider: "apple" | "google", idToken: { token } }
//   POST /api/auth/sign-up/email   { name, email, password, username? }   (*)
//   POST /api/auth/sign-in/email   { email, password }                    (*)
//   POST /api/auth/sign-out
//   GET  /api/auth/get-session
//
//   (*) AUTH_EMAIL_PASSWORD_ENABLED が true のときだけ。既定では production で無効。
//       本番の画面は Apple / Google のみで、メール + パスワードは seed・テスト・開発用。
//
// 認証方法は 2 通り受け付ける:
//   - Authorization: Bearer <token>  (モバイル。token は sign-in の response body と
//                                     `set-auth-token` header に入る)
//   - session cookie                 (Web / @better-auth/expo クライアント)
//
// 「current user」は Tadori 側の GET /me が返す (routes/me)。

/** client ID と secret が揃っている provider だけを有効にする */
function buildSocialProviders() {
  const googleClientId = env.GOOGLE_CLIENT_ID;
  return {
    ...(googleClientId && googleClientId.length > 0 && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: googleClientId, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}),
    ...(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
      ? {
          apple: {
            clientId: env.APPLE_CLIENT_ID,
            clientSecret: env.APPLE_CLIENT_SECRET,
            // ネイティブの Sign in with Apple が発行する ID token は audience が bundle ID になる
            appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
          },
        }
      : {}),
  };
}

const socialProviders = buildSocialProviders();

export const enabledLoginMethods = {
  emailPassword: env.AUTH_EMAIL_PASSWORD_ENABLED,
  google: "google" in socialProviders,
  apple: "apple" in socialProviders,
};

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),
  emailAndPassword: { enabled: env.AUTH_EMAIL_PASSWORD_ENABLED, minPasswordLength: 8 },
  socialProviders,
  user: {
    // Better Auth の `image` を Tadori の `avatarUrl` として保存する
    fields: { image: "avatarUrl" },
    additionalFields: {
      // signup 時は任意。省略すると仮の username が自動採番される (下の hook)
      username: { type: "string", required: false, input: true },
      usernameConfirmed: { type: "boolean", required: false, input: false },
      bio: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // username を確定させてから保存する (DB の列は NOT NULL)。
        // - 指定あり: 形式と重複を検証し、確定済み (usernameConfirmed = true) にする
        // - 指定なし: 仮の username を採番する。本人が PATCH /me で決めるまで未確定
        before: async (user) => {
          if (typeof user.username !== "string" || user.username.length === 0) {
            return {
              data: { ...user, username: generateProvisionalUsername(), usernameConfirmed: false },
            };
          }

          const parsed = usernameSchema.safeParse(user.username);
          if (!parsed.success) {
            throw new APIError("BAD_REQUEST", {
              code: "VALIDATION_ERROR",
              message: parsed.error.issues[0]?.message ?? "Invalid username",
            });
          }
          const [existing] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, parsed.data))
            .limit(1);
          if (existing) {
            throw new APIError("UNPROCESSABLE_ENTITY", {
              code: "USERNAME_TAKEN",
              message: "Username is already taken",
            });
          }
          return { data: { ...user, username: parsed.data, usernameConfirmed: true } };
        },
      },
    },
  },
  // Expo アプリ (deep link scheme)・Web クライアント・Apple の認証画面を信頼する
  trustedOrigins: [
    `${env.APP_SCHEME}://`,
    ...env.CORS_ORIGIN,
    ...(enabledLoginMethods.apple ? ["https://appleid.apple.com"] : []),
  ],
  plugins: [expo(), bearer()],
  // Better Auth 自身のログも共通 logger に通す。追加の引数 (token などを含み得る) は出さない
  logger: {
    log: (level, message) => {
      if (level === "error") logger.error(`[better-auth] ${message}`);
      else if (level === "warn") logger.warn(`[better-auth] ${message}`);
      else logger.debug(`[better-auth] ${message}`);
    },
  },
  telemetry: { enabled: false },
});
