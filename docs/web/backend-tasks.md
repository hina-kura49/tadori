# バックエンド課題（Web 版対応）の解説

Web 版（`apps/web`）を本番に出すまでに、API（`apps/api`）側でやることをまとめました。

> **課題3・4・5 は実装済みです。** 「API にレート制限・公開ロードマップのテスト・user_preferences を追加」のコミットで
> `apps/api` に入っています。このページは **実際のコードの解説** として読んでください（写経のお手本ではなくなりました）。
> 課題1・2 はコード変更のない本番の設定作業なので、公開のときに行います。
>
> 実装に合わせて Web 側も対応済みです:
> - オンボーディングで興味のある分野を選び、`PATCH /me/preferences` に保存（`apps/web/src/routes/onboarding.tsx`）
> - Today のメインの Roadmap を `primaryRoadmapId` から決め、「メインにする」で切り替え（`routes/today.tsx`）
> - 設定画面で興味のある分野を編集（`routes/settings.tsx`）
> - 中継（`functions/_api/[[path]].ts`）が `x-client-ip` と `x-proxy-secret` を付ける

## まず前提：Web 版は「同じオリジンの中継」で API を呼ぶ

オリジンとは「`https://` + ドメイン + ポート」の組のことです。ブラウザはオリジンが違うと通信や Cookie を厳しく制限します。
Web 版はこの制限を避けるため、API を直接呼ばずに **自分と同じオリジンの `/_api` を経由** します。

```
ブラウザ ──> https://<Web のドメイン>/_api/me ──(中継)──> https://tadori.onrender.com/me
             ・開発中: Vite の proxy（apps/web/vite.config.ts）
             ・本番  : Cloudflare Pages Functions（apps/web/functions/_api/[[path]].ts）
```

ブラウザから見ると全部「Web のドメイン」との通信なので、

- CORS（別オリジンからの通信の許可）はブラウザ上では発生しない
- ログイン Cookie は Web のドメインに保存され、`/_api/*` へ自動で送られる

という、いちばん単純な形になります。以下の課題はこの構成を前提にしています。

## 課題一覧

| # | 課題 | 難しさ | 目安 | 状態 |
|---|---|---|---|---|
| 1 | `CORS_ORIGIN` に Web のオリジンを足す | ★☆☆ | 15分 | 公開時に設定（環境変数だけ） |
| 2 | 本番の Cookie 設定を理解して確かめる | ★★☆ | 45分 | 公開時に確認（中継は条件を満たし済み） |
| 3 | ログイン API にレート制限を入れる | ★★☆ | 1.5時間 | **実装済み**（ミドルウェア＋テスト） |
| 4 | 公開ロードマップが未ログインで見られるか確認 | ★☆☆ | 30分 | **実装済み**（テスト1本） |
| 5 | 端末内だけのデータを API に移す（1つ分） | ★★★ | 3時間 | **実装済み**（テーブル〜テストまで一式） |

読む順番は 1 → 4 → 2 → 3 → 5 がおすすめです。

### 作業の基本

```sh
# ローカルの Postgres に繋いだ API を起動（本番 DB には繋がらない）
./scripts/local-api.sh

# API のテスト（テスト用 DB: postgres://tadori:tadori@localhost:55432/tadori_test）
pnpm --filter @tadori/api test
pnpm --filter @tadori/api typecheck
```

> `apps/api/.env` はローカル DB（docker compose、`localhost:55432`）向けです。本番の値は `.env.production`（Git 管理外）にあり、`ENV_FILE=.env.production` を付けたときだけ読まれます（[運用](../operations.md)）。

---

## 課題1：`CORS_ORIGIN` に Web のオリジンを足す

### ゴール
Web 版からのログイン・ログアウトが `403 INVALID_ORIGIN` にならないようにする。

### なぜ必要か
「中継するなら CORS は関係ないのでは？」と思うかもしれません。ブラウザの CORS は確かに関係なくなります。
でも **better-auth（認証ライブラリ）は、Cookie 付きのリクエストの `Origin` ヘッダーを自分でチェックします**。CSRF（別サイトから勝手にリクエストを送らせる攻撃）対策です。中継は `Origin: https://<Web のドメイン>` をそのまま API に渡すので、そのオリジンを「信頼済み」として登録しておく必要があります。

`src/lib/auth.ts` を見ると、`CORS_ORIGIN` が better-auth の `trustedOrigins`（信頼するオリジンの一覧）にもそのまま入っています。

```ts
  // Expo アプリ (deep link scheme)・Web クライアント・Apple の認証画面を信頼する
  trustedOrigins: [
    `${env.APP_SCHEME}://`,
    ...env.CORS_ORIGIN,
    ...(enabledLoginMethods.apple ? ["https://appleid.apple.com"] : []),
  ],
```

つまり `CORS_ORIGIN` 1つで「Hono の CORS 設定」と「better-auth の Origin チェック」の両方が決まります。
`CORS_ORIGIN` はカンマ区切りで複数書けます（`src/lib/env.ts` で `split(",")` しています）。

### 触るもの
- ローカル: `apps/api/.env`
- 本番: Render のダッシュボード → サービス `tadori` → Environment

### 手順
ローカル（`.env`）:
```
CORS_ORIGIN=http://localhost:5173,http://localhost:8081
```
ローカル用の `apps/api/.env` には設定済みです。

本番（Render）: Web 版を Cloudflare Pages に公開して URL が決まったら、今の値の末尾に足します。
```
CORS_ORIGIN=<今の値>,https://<プロジェクト名>.pages.dev
```
独自ドメインを付けたら、それも足します。保存すると再デプロイが必要です（自動デプロイは OFF なので手動で Deploy）。

### 確かめ方
ローカル API（`http://localhost:4000`）に対して:

```sh
# 1) ログインして Cookie を取る
curl -s -c /tmp/cj -H "Content-Type: application/json" \
  -d '{"email":"webcheck@example.com","password":"password1234"}' \
  http://localhost:4000/api/auth/sign-in/email > /dev/null

# 2) 信頼していない Origin からのログアウト → 403
curl -s -b /tmp/cj -H "Content-Type: application/json" -H "Origin: https://evil.example" \
  -d '{}' http://localhost:4000/api/auth/sign-out
# => {"message":"Invalid origin","code":"INVALID_ORIGIN"}

# 3) CORS_ORIGIN に入れた Origin → 200
curl -s -b /tmp/cj -H "Content-Type: application/json" -H "Origin: http://localhost:5173" \
  -d '{}' http://localhost:4000/api/auth/sign-out
# => {"success":true}
```
（`webcheck@example.com` はローカル DB にある確認用アカウントです。無ければ `sign-up/email` に `name` 付きで送って作ってください。）

### つまずきポイント
- **末尾の `/` を付けない**。`https://example.pages.dev/` と書くと一致しません。
- Cloudflare Pages は **プレビュー用 URL**（`https://<ハッシュ>.<プロジェクト名>.pages.dev`）も発行します。プレビューでもログインを試したいなら、それも足す必要があります。
- Cookie が無いリクエストでも、`Origin` や `Sec-Fetch-*` ヘッダーが付いていれば better-auth はチェックします（ブラウザからのサインインはこちら）。「Cookie が無いから大丈夫」ではありません。

---

## 課題2：本番の Cookie 設定を理解して確かめる

### ゴール
本番で「ログインできたのに、次の画面で未ログイン扱いになる」を起こさない。そのために、better-auth がどんな Cookie を出すかを実装から理解する。

### なぜ必要か
Cookie の属性は「どのドメインに保存するか」「どの通信で送るか」を決めます。1つ間違えると、ログインが成功しても Cookie がブラウザに保存されず、原因がとても分かりにくくなります。

### better-auth の実装を読む
`node_modules/better-auth/dist/cookies/index.mjs` の `createCookieGetter` が Cookie の名前と属性を決めています（読みやすく整えて抜粋）。

```js
// https:// で始まる baseURL (= BETTER_AUTH_URL) なら "__Secure-" を付ける
const secureCookiePrefix =
  (options.advanced?.useSecureCookies ?? baseURL.startsWith("https://"))
    ? "__Secure-" : "";

return {
  name: `${secureCookiePrefix}better-auth.session_token`,
  attributes: {
    secure: !!secureCookiePrefix,  // __Secure- のときだけ Secure
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    // crossSubDomainCookies を有効にしたときだけ domain が付く
    ...options.advanced?.defaultCookieAttributes,
  },
};
```

本番の `BETTER_AUTH_URL` は `https://tadori.onrender.com`（未設定なら Render の `RENDER_EXTERNAL_URL`）なので、実際にはこうなります（コピーした API を `https://` の `BETTER_AUTH_URL` で起動して確認）。

```
set-cookie: __Secure-better-auth.session_token=...; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax
```

| 属性 | 意味 | 中継方式での影響 |
|---|---|---|
| `__Secure-` 接頭辞 | 「https で、`Secure` 付きでしか保存できない」とブラウザに約束させる名前 | Pages は https なので問題なし |
| `Secure` | https の通信でしか送らない | 同上 |
| `HttpOnly` | JavaScript から読めない（XSS で盗まれにくい） | Web 版は Cookie を JS で触らないので問題なし |
| `SameSite=Lax` | 別サイトからの POST などでは送らない | 同じオリジンの `/_api` なので常に送られる |
| `Path=/` | サイト内のどのパスにも送る | `/_api/*` にも送られる |
| `Domain` なし | 「Set-Cookie を受け取ったホストだけ」に保存 | **ブラウザが受け取るのは Web のドメイン** なので、Web のドメインに保存される |

最後の行がポイントです。API が `tadori.onrender.com` で Cookie を発行しても、ブラウザはそれを **中継を通して Web のドメインから受け取る** ので、Web のドメインの Cookie として保存されます。だから:

- **`SameSite=None` は不要**（別サイト扱いの通信が起きないため）
- **`advanced.crossSubDomainCookies` も不要**
- **`advanced.*` のコード変更は不要** です

### 中継側に必要な条件（フロントエンド担当への確認事項）
Cookie 設定を変えない代わりに、中継（Pages Functions）が次を守る必要があります。フロントエンドの実装を読んで確認してください。

1. **`Set-Cookie` を書き換えずに、複数あっても全部返す**。better-auth はログイン時に複数の Cookie を返すことがあります。
2. **`Origin` ヘッダーをそのまま API に渡す**（課題1のチェックに使われるため）。
3. **`Cookie` ヘッダーをそのまま API に渡す**。
4. （課題3のため）`x-client-ip` と `x-proxy-secret` を付ける。

### 確かめ方
Web 版を公開したら、ブラウザの開発者ツール → Application → Cookies で、**Web のドメイン** に `__Secure-better-auth.session_token` があれば成功です。

### つまずきポイント
- **ローカルでは `__Secure-` が付きません**。ローカルの `BETTER_AUTH_URL` は `http://localhost:4000` なので、名前は `better-auth.session_token`、`Secure` も付きません。本番とローカルで Cookie 名が違うのは正常です。
- `BETTER_AUTH_URL` を `http://...` にしたまま本番に出すと、`Secure` の付かない Cookie になります。必ず `https://` にします。
- 逆に、ローカルで `BETTER_AUTH_URL=https://...` にすると `Secure` Cookie になります。`http://localhost` で保存できるかはブラウザによって違います（Safari は保存しないことがある）。
- API の URL を独自ドメイン（例: `api.tadori.app`）に変えたら、`BETTER_AUTH_URL` もそれに合わせます。これは Apple/Google ログインの戻り先 URL にも使われます。

---

## 課題3：ログイン API にレート制限を入れる

### ゴール
同じ IP から `/api/auth/sign-in/*` と `/api/auth/sign-up/*` を **1分に10回まで** に制限する。超えたら `429` と、統一形式のエラー `{ code: "RATE_LIMITED", message }` を返す。

### なぜ必要か
Web 版は誰でもブラウザから触れるので、パスワードを片っ端から試す「総当たり攻撃」を受けやすくなります。レート制限（一定時間あたりの回数制限）で、攻撃にかかる時間を現実的でない長さにします。

### better-auth にも制限はある（でも自作する理由）
実は better-auth にもレート制限が入っていて、**本番（`NODE_ENV=production`）では自動で有効** です（`node_modules/better-auth/dist/context/create-context.mjs`）。サインインは「10秒に3回」です。
ただし IP の取り方に弱点があります（`node_modules/@better-auth/core/dist/utils/ip.mjs` の `getIPFromHeader`）。

```js
if (forwardedIps.length !== 1) return null; // x-forwarded-for に IP が2つ以上あると諦める
```

中継を挟むと `x-forwarded-for` に IP が2つ以上並ぶことがあり、そのとき better-auth は IP を特定できません。すると **全員が1つの枠を共有** します（「10秒に3回」を利用者全員で奪い合う）。Render のログに次の警告が出ていたら、この状態です。

```
Rate limiting could not determine a client IP and is falling back to a single shared per-path bucket.
```

そこで、IP の取り方を自分で決められる自作ミドルウェアを入れます。仕組みを理解する練習にもなります。

### 仕組み（固定ウィンドウ方式）
「IP ごとに、最初のアクセスから60秒の枠を作り、その中の回数を数える。上限を超えたら拒否。60秒経ったら枠を作り直す」という一番単純な方式です。カウンターはプロセスのメモリ（`Map`）に持ちます。

### IP の決め方
- **Web 版（中継経由）**: 中継が `x-client-ip` に本当の IP を入れて送る。ただし誰でもこのヘッダーを偽れるので、**中継と API だけが知る合言葉（`x-proxy-secret`）が一致したときだけ** 信じる。
- **モバイル（直接）**: `x-forwarded-for` の **末尾**。Render の中継サーバーが最後に付け足す値で、利用者が偽れるのは先頭側だけです。

### 触るファイル
- 新規: `src/middleware/rate-limit.ts`、`tests/rate-limit.test.ts`
- 変更: `src/lib/errors.ts`、`src/lib/env.ts`、`src/app.ts`、`vitest.config.ts`、`.env.example`

### 実装したコード

**`src/lib/errors.ts`**（エラーコードを1つ足し、ヘルパー関数を末尾に追加）
```diff
@@ -28,6 +28,7 @@
   "CIRCLE_SCHEDULE_NOT_FOUND",
   "DEVICE_NOT_FOUND",
   "PUSH_TOKEN_IN_USE",
+  "RATE_LIMITED",
 ] as const;
 
 export type ErrorCode = (typeof ERROR_CODES)[number];
@@ -75,3 +76,6 @@
 export const conflict = (code: ErrorCode, message: string) => new AppError(409, code, message);
 
 export const badRequest = (code: ErrorCode, message: string) => new AppError(400, code, message);
+
+export const tooManyRequests = (message = "Too many requests. Please try again later.") =>
+  new AppError(429, "RATE_LIMITED", message);
```

**`src/lib/env.ts`**（合言葉の環境変数を追加）
```diff
@@ -32,6 +32,9 @@
         .filter((origin) => origin.length > 0),
     ),
   APP_SCHEME: z.string().min(1).default("tadori"),
+  // Web 版の中継 (Cloudflare Pages Functions) と API だけが知る合言葉。
+  // 一致したリクエストだけ、中継が付けた x-client-ip を本当の IP として信じる
+  PROXY_SHARED_SECRET: optionalString,
   EXPO_ACCESS_TOKEN: optionalString,
   LOG_LEVEL: optionalString.pipe(
     z.enum(["debug", "info", "warn", "error", "silent"]).optional(),
```

**`src/middleware/rate-limit.ts`**（新規）
```ts
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { env } from "../lib/env";
import { tooManyRequests } from "../lib/errors";

// 固定ウィンドウ方式のレート制限 (一定時間あたりの回数制限)。
//
// カウンターはこのプロセスのメモリに持つ。Render の無料プランは 1 台なのでこれで足りるが、
// 台数を増やすと台ごとに別々に数えてしまう (そのときは Redis などの共有ストアへ移す)。
// 再起動するとカウンターは 0 に戻る。

type RateLimitOptions = {
  /** 数える時間の長さ (ミリ秒) */
  windowMs: number;
  /** windowMs の間に許す回数 */
  limit: number;
  /** 誰の回数として数えるか。既定はクライアントの IP */
  keyGenerator?: (c: Context) => string;
};

type Counter = { count: number; resetAt: number };

/** これを超えたら期限切れのカウンターを掃除する (メモリが増え続けないように) */
const MAX_COUNTERS = 10_000;

/**
 * レート制限に使うクライアントの IP。
 * - Web 版の中継経由: 中継が付ける x-client-ip を使う。ただし合言葉 (x-proxy-secret) が
 *   一致したときだけ。そうしないと誰でも x-client-ip を偽って制限をすり抜けられる
 * - それ以外: x-forwarded-for の末尾。Render の中継サーバーが最後に付け足す値で、
 *   利用者が自分で書き換えられるのは先頭側だけ
 */
export function clientIp(c: Context): string {
  const secret = env.PROXY_SHARED_SECRET;
  if (secret && c.req.header("x-proxy-secret") === secret) {
    const proxied = c.req.header("x-client-ip");
    if (proxied) return proxied;
  }
  const forwarded = c.req.header("x-forwarded-for")?.split(",");
  return forwarded?.at(-1)?.trim() || "unknown";
}

export function rateLimit({ windowMs, limit, keyGenerator = clientIp }: RateLimitOptions) {
  const counters = new Map<string, Counter>();

  return createMiddleware(async (c, next) => {
    const now = Date.now();
    if (counters.size > MAX_COUNTERS) {
      for (const [key, counter] of counters) {
        if (counter.resetAt <= now) counters.delete(key);
      }
    }

    const key = keyGenerator(c);
    const counter = counters.get(key);
    if (!counter || counter.resetAt <= now) {
      counters.set(key, { count: 1, resetAt: now + windowMs });
    } else if (counter.count < limit) {
      counter.count++;
    } else {
      // 何秒後にまた試せるか。onError が作るレスポンスにもこの header は残る
      c.header("Retry-After", String(Math.ceil((counter.resetAt - now) / 1000)));
      throw tooManyRequests();
    }
    await next();
  });
}
```

**`src/app.ts`**（コメントがあった場所に入れる）
```diff
@@ -3,6 +3,7 @@
 import { secureHeaders } from "hono/secure-headers";
 import { env } from "./lib/env";
 import { handleError, handleNotFound } from "./middleware/error-handler";
+import { rateLimit } from "./middleware/rate-limit";
 import { requestLogger } from "./middleware/request-logger";
 import { authRoutes } from "./routes/auth";
 import { booksRoutes } from "./routes/books";
@@ -25,9 +26,13 @@
     allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
   }),
 );
-// Rate Limit を入れる場合はここに追加する (例: hono-rate-limiter)。
-//   app.use("/api/auth/*", authRateLimiter);
-//   app.use(defaultRateLimiter);
+// ログインと新規登録は同じ IP から 1 分に 10 回まで (パスワードの総当たり対策)。
+// テストは 1 ファイルで何十人も signup するので外す (middleware 自体は rate-limit.test.ts で確認)
+if (env.NODE_ENV !== "test") {
+  const authRateLimiter = rateLimit({ windowMs: 60_000, limit: 10 });
+  app.use("/api/auth/sign-in/*", authRateLimiter);
+  app.use("/api/auth/sign-up/*", authRateLimiter);
+}
 
 app.onError(handleError);
 app.notFound(handleNotFound);
```

**`vitest.config.ts`**（テスト用の合言葉）
```diff
@@ -17,6 +17,7 @@
       BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-1234",
       BETTER_AUTH_URL: "http://localhost:4000",
       CORS_ORIGIN: "http://localhost:8081",
+      PROXY_SHARED_SECRET: "test-proxy-secret",
     },
   },
 });
```

**`tests/rate-limit.test.ts`**（新規）
```ts
import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleError } from "../src/middleware/error-handler";
import { clientIp, rateLimit } from "../src/middleware/rate-limit";

// app.ts ではテスト中にレート制限を外しているので、小さな Hono app に付けて確かめる

function createTestApp(limit: number) {
  const app = new Hono();
  app.onError(handleError);
  app.use(rateLimit({ windowMs: 60_000, limit }));
  app.post("/sign-in", (c) => c.json({ ok: true }, 200));
  app.get("/ip", (c) => c.text(clientIp(c)));
  return app;
}

const signIn = (app: Hono, ip: string) =>
  app.request("/sign-in", { method: "POST", headers: { "x-forwarded-for": ip } });

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit middleware", () => {
  it("上限を超えると統一形式の 429 と Retry-After を返す", async () => {
    const app = createTestApp(2);
    expect((await signIn(app, "203.0.113.1")).status).toBe(200);
    expect((await signIn(app, "203.0.113.1")).status).toBe(200);

    const blocked = await signIn(app, "203.0.113.1");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("60");
    expect(await blocked.json()).toEqual({
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
    });
  });

  it("IP ごとに別々に数える", async () => {
    const app = createTestApp(1);
    expect((await signIn(app, "203.0.113.1")).status).toBe(200);
    expect((await signIn(app, "203.0.113.1")).status).toBe(429);
    expect((await signIn(app, "203.0.113.2")).status).toBe(200);
  });

  it("windowMs が過ぎると元に戻る", async () => {
    vi.useFakeTimers();
    const app = createTestApp(1);
    expect((await signIn(app, "203.0.113.1")).status).toBe(200);
    expect((await signIn(app, "203.0.113.1")).status).toBe(429);

    vi.advanceTimersByTime(60_000);
    expect((await signIn(app, "203.0.113.1")).status).toBe(200);
  });
});

describe("clientIp", () => {
  const ipOf = async (headers: Record<string, string>) => {
    const response = await createTestApp(100).request("/ip", { headers });
    return response.text();
  };

  it("x-forwarded-for の末尾 (Render が付け足した値) を使う", async () => {
    expect(await ipOf({ "x-forwarded-for": "198.51.100.9, 203.0.113.1" })).toBe("203.0.113.1");
    expect(await ipOf({})).toBe("unknown");
  });

  it("x-client-ip は合言葉が一致したときだけ信じる", async () => {
    const headers = { "x-forwarded-for": "203.0.113.1", "x-client-ip": "198.51.100.9" };
    expect(await ipOf(headers)).toBe("203.0.113.1");
    expect(await ipOf({ ...headers, "x-proxy-secret": "wrong" })).toBe("203.0.113.1");
    expect(await ipOf({ ...headers, "x-proxy-secret": "test-proxy-secret" })).toBe("198.51.100.9");
  });
});
```

**`.env.example`** にも1行足しておきます（値は書かない）。
```
# Web 版の中継と共有する合言葉。Cloudflare Pages 側にも同じ値を設定する (openssl rand -hex 32 で作る)
PROXY_SHARED_SECRET=
```

### 確かめ方
```sh
pnpm --filter @tadori/api typecheck
pnpm --filter @tadori/api test -- tests/rate-limit.test.ts
```

実際の API でも確認します（`./scripts/local-api.sh` で起動しておく）。
```sh
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code} " -H "Content-Type: application/json" \
    -H "x-forwarded-for: 198.51.100.7" \
    -d '{"email":"webcheck@example.com","password":"password1234"}' \
    http://localhost:4000/api/auth/sign-in/email
done; echo
# => 200 200 200 200 200 200 200 200 200 200 429
```
11回目が `429` になり、レスポンスに `retry-after: 60` が付けば成功です。

### 本番に出すとき
1. `openssl rand -hex 32` で合言葉を作る。
2. Render の Environment に `PROXY_SHARED_SECRET` を追加する。
3. Cloudflare Pages の環境変数にも同じ値を入れてもらう（中継が `x-proxy-secret` に入れて送る）。

### つまずきポイント
- **テストでは外している理由**: テストは1ファイルで何十人も新規登録します。制限を掛けたままだと途中から `429` になって無関係なテストが落ちます。だからミドルウェアは小さな Hono アプリに付けて単体で確かめています。
- **`Retry-After` が消えないか**: `throw` するとレスポンスは `onError` で作り直されますが、`c.header()` で先に付けたヘッダーは残ります（テストで確認済み）。
- **カウンターはメモリなので、再起動で0に戻り、サーバーを2台にすると台ごとに数えます**。Render の無料プランは1台なので今は問題ありません。
- **`x-forwarded-for` の末尾が本当に Render の付けた値か** は、Render の仕様次第です。一度だけ本番で `logger.info("xff", { xff: c.req.header("x-forwarded-for") })` を仕込んで、自分のスマホからアクセスして確かめると安心です（確認したら消す）。
- 合言葉の比較は `===` です。厳密には比較時間の差から推測される攻撃（タイミング攻撃）がありますが、ネット越しでは現実的でないのでここでは割り切っています。気になれば `node:crypto` の `timingSafeEqual` を調べてみてください。

---

## 課題4：公開ロードマップが未ログインで見られるか確認

### ゴール
Web 版の共有ページ（`/r/:slug`）を、ログインしていない人でも表示できるか確かめる。

### 結論：すでに対応済み（追加の API は不要）
`src/routes/roadmaps.ts` を読むと、一覧と詳細は `requireAuth`（ログイン必須）ではありません。

```ts
  .get("/", validate("query", listRoadmapsQuerySchema), async (c) => {        // 一覧: 認証なし
  ...
  .get("/:slug", optionalAuth, validate("param", roadmapSlugParamSchema), async (c) => {  // 詳細: ログインは任意
```

`optionalAuth`（`src/middleware/auth.ts`）は、ログインしていなくても通し、`c.get("viewer")` に `null` を入れます。見てよいかどうかは `src/policies/roadmap.policy.ts` が決めます。

| 公開範囲 | 未ログインで見られるか |
|---|---|
| `PUBLIC` | 見られる（一覧にも出る） |
| `UNLISTED` | URL を知っていれば見られる（一覧には出ない） |
| `PRIVATE` | 作った本人だけ。他人には **404**（存在自体を隠す） |

`UNLISTED` と `PRIVATE` のテストは `tests/roadmaps.test.ts` にすでにありますが、`PUBLIC` を未ログインで開いたとき「Step まで取れて、本人の進捗は入らない」ことを確かめるテストはありません。練習として1本足しましょう。

### 触るファイル
- `tests/roadmaps.test.ts`（`describe("Roadmap visibility", ...)` の中、`UNLISTED` のテストの直前）

### 実装したコード
```ts
  it("PUBLIC は未ログインでも Step まで取得でき、本人の進捗 (userProgress) は null", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { stepCount: 2 });
    await api("POST", `/roadmaps/${roadmap.id}/start`, { as: alice });

    const anonymous = await api("GET", `/roadmaps/${roadmap.slug}`);
    expect(anonymous.status).toBe(200);
    expect(anonymous.body.steps).toHaveLength(2);
    expect(anonymous.body.userProgress).toBeNull();

    const own = await api("GET", `/roadmaps/${roadmap.slug}`, { as: alice });
    expect(own.body.userProgress).not.toBeNull();
  });
```

### 確かめ方
```sh
pnpm --filter @tadori/api test -- tests/roadmaps.test.ts

# 実際の API でも（ローカル DB のサンプルデータ）
curl -s http://localhost:4000/roadmaps | head -c 300
```

### つまずきポイント
- `/:slug` は **slug**（URL 用の文字列）で、更新系の `/:id` は **UUID** です。同じ `/roadmaps/xxx` でもメソッドによって意味が違います。
- `userProgress` は「見ている人自身の進捗」です。未ログインなら必ず `null` になります。

---

## 課題5：端末内だけのデータを API に移す

### ゴール
mobile が端末内（AsyncStorage）にだけ保存しているデータのうち、Web 版でも必要なものを API に移す。例として「興味のあるカテゴリ・メインの Roadmap・オンボーディング完了」を実装する。

### 洗い出し（`apps/mobile/src/api/localState.ts`）

| 項目 | 中身 | Web 版で困ること | 移す優先度 |
|---|---|---|---|
| `onboarded` | Welcome と興味選択を終えたか | Web で毎回オンボーディングが出る | **高**（今回実装） |
| `interests` | 興味のあるカテゴリ | Web のおすすめが空になる | **高**（今回実装） |
| `primaryRoadmapId` | Today で大きく出す Roadmap | 端末ごとに違う Roadmap が出る | **高**（今回実装） |
| `weekdays` | 学習リマインダーを鳴らす曜日 | Web には端末の通知がない。機種変更で消える | 中（`notification_preferences` に列を足すのが自然） |
| `reminderRoadmapId` | リマインダーの対象 Roadmap | 同上 | 中（同上） |
| `avatarUri` | 端末内の画像ファイルの場所 | Web では端末のファイルを読めない | 中（画像アップロード API＋Supabase Storage が必要。大きめ） |
| `bookCovers` | 本の表紙画像（端末内ファイル） | 同上 | 中（同上） |

### 設計
`notification_preferences`（通知設定）と同じ形にします。既にある書き方をなぞるので、読み比べると理解が深まります。

- テーブル `user_preferences`：1ユーザー1行。**行が無ければ既定値** として扱う（GET では行を作らない）
- `GET /me/preferences` → `{ interests, primaryRoadmapId, onboarded }`
- `PATCH /me/preferences` → 送った項目だけ更新
- メインの Roadmap に選べるのは **本人が学習を始めたものだけ**（それ以外は `404 USER_ROADMAP_NOT_FOUND`）
- Roadmap が削除されたら `primaryRoadmapId` は自動で `null` に戻る（外部キーの `on delete set null`）
- 新しいテーブルは RLS（行単位のアクセス制御）を有効にする（`apps/api/docs/supabase.md` の方針）

処理の流れ（既存と同じ層の分け方）:
```
route (routes/me.ts) → schema で入力チェック (schemas/me.schema.ts)
  → service (services/user-preference.service.ts) … ルールと既定値のマージ
    → repository (repositories/user-preference.repository.ts) … SQL だけ
```

### 触るファイル
- 新規: `src/db/schema/preferences.ts`、`src/types/preference.ts`、`src/dto/preference.dto.ts`、`src/repositories/user-preference.repository.ts`、`src/services/user-preference.service.ts`、`tests/preferences.test.ts`
- 自動生成: `drizzle/0002_user_preferences.sql`、`drizzle/meta/0002_snapshot.json`、`drizzle/meta/_journal.json`
- 変更: `src/db/schema/index.ts`、`src/schemas/me.schema.ts`、`src/routes/me.ts`、`tests/helpers/setup.ts`

### 実装したコード

**① テーブル定義 `src/db/schema/preferences.ts`**（新規）
```ts
import { sql } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, timestamptz, updatedAt } from "./columns";
import { roadmapCategoryEnum } from "./enums";
import { roadmaps } from "./roadmaps";

// 表示上の好み。以前は mobile の端末内 (apps/mobile/src/api/localState.ts) にだけ持っていたが、
// Web 版や機種変更後の端末でも同じ状態を見られるように API へ移した。
// 行が無い User は「既定値」として扱う (user-preference.service.ts 参照)
//
// enableRLS: Supabase の Data API から直接読まれないよう、ほかのテーブルと同じく RLS を有効にする
// (apps/api/docs/supabase.md)。API は所有者ロールで接続するので影響を受けない
export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  interests: roadmapCategoryEnum("interests")
    .array()
    .notNull()
    .default(sql`'{}'`),
  // Today で大きく表示する Roadmap。Roadmap が消えたら未選択に戻す
  primaryRoadmapId: uuid("primary_roadmap_id").references(() => roadmaps.id, {
    onDelete: "set null",
  }),
  // Welcome と興味選択を終えた日時。null = まだ
  onboardedAt: timestamptz("onboarded_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS();
```

**`src/db/schema/index.ts`**
```diff
@@ -4,3 +4,4 @@
 export * from "./roadmaps";
 export * from "./circles";
 export * from "./notifications";
+export * from "./preferences";
```

**② マイグレーション（DB を変更する SQL）を生成**。手で書かず、drizzle-kit に作らせます。
```sh
cd apps/api
pnpm db:generate --name user_preferences
```
次の内容の `drizzle/0002_user_preferences.sql` ができれば正解です（中身は確認するだけで、手で直さない）。
```sql
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"interests" "roadmap_category"[] DEFAULT '{}' NOT NULL,
	"primary_roadmap_id" uuid,
	"onboarded_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_primary_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("primary_roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE set null ON UPDATE no action;
```
ローカル DB に適用するには `./scripts/local-api.sh` を起動し直します（起動時に `db:migrate` が走ります）。テストは実行時に自動で適用されます。

**③ 型と既定値 `src/types/preference.ts`**（新規）
```ts
import type { RoadmapCategory } from "../db/schema";

// 表示上の好み (user_preferences) の型と既定値。

export type UserPreferenceValues = {
  interests: RoadmapCategory[];
  primaryRoadmapId: string | null;
  onboardedAt: Date | null;
};

/** user_preferences に行が無い User はこの値として扱う (DB の default と揃えること) */
export const DEFAULT_USER_PREFERENCES: UserPreferenceValues = {
  interests: [],
  primaryRoadmapId: null,
  onboardedAt: null,
};
```

**④ レスポンスの形 `src/dto/preference.dto.ts`**（新規）
```ts
import type { RoadmapCategory } from "../db/schema";

/** onboardedAt (日時) はクライアントに要らないので「終えたかどうか」だけ返す */
export type UserPreferenceDto = {
  interests: RoadmapCategory[];
  primaryRoadmapId: string | null;
  onboarded: boolean;
};
```

**⑤ 入力チェック `src/schemas/me.schema.ts`**
```diff
@@ -1,5 +1,5 @@
 import { z } from "zod";
-import { DEVICE_PLATFORMS } from "../db/schema";
+import { DEVICE_PLATFORMS, ROADMAP_CATEGORIES } from "../db/schema";
 import { nullableTrimmedString, trimmedString, usernameSchema } from "./common.schema";
 
 export const updateMeSchema = z
@@ -45,6 +45,20 @@
   .partial()
   .refine((value) => Object.keys(value).length > 0, "At least one field is required");
 
+export const updatePreferenceSchema = z
+  .object({
+    // 同じ Category を 2 回送られても 1 つにまとめる
+    interests: z
+      .array(z.enum(ROADMAP_CATEGORIES))
+      .max(ROADMAP_CATEGORIES.length)
+      .transform((values) => [...new Set(values)]),
+    primaryRoadmapId: z.uuid().nullable(),
+    onboarded: z.boolean(),
+  })
+  .partial()
+  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
+
 export type UpdateMeInput = z.infer<typeof updateMeSchema>;
 export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
 export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;
+export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;
```

**⑥ Repository `src/repositories/user-preference.repository.ts`**（新規）
```ts
import { eq } from "drizzle-orm";
import { db, type DbExecutor } from "../db/client";
import { userPreferences } from "../db/schema";
import type { UserPreferenceValues } from "../types/preference";

export type UserPreferenceRow = typeof userPreferences.$inferSelect;

export async function findByUserId(
  userId: string,
  executor: DbExecutor = db,
): Promise<UserPreferenceRow | null> {
  const [row] = await executor
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return row ?? null;
}

/** values は「既定値 + 既存値 + 変更分」をマージ済みの完全な値を渡す */
export async function upsert(
  userId: string,
  values: UserPreferenceValues,
  executor: DbExecutor = db,
): Promise<UserPreferenceRow> {
  const [row] = await executor
    .insert(userPreferences)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  if (!row) throw new Error("upsert user preference returned no row");
  return row;
}
```

**⑦ Service `src/services/user-preference.service.ts`**（新規）
```ts
import type { UserPreferenceDto } from "../dto/preference.dto";
import { notFound } from "../lib/errors";
import * as userPreferenceRepository from "../repositories/user-preference.repository";
import * as userRoadmapRepository from "../repositories/user-roadmap.repository";
import type { UpdatePreferenceInput } from "../schemas/me.schema";
import type { AuthUser } from "../types/app";
import { DEFAULT_USER_PREFERENCES, type UserPreferenceValues } from "../types/preference";

function toDto(values: UserPreferenceValues): UserPreferenceDto {
  return {
    interests: values.interests,
    primaryRoadmapId: values.primaryRoadmapId,
    onboarded: values.onboardedAt !== null,
  };
}

async function findValues(user: AuthUser): Promise<UserPreferenceValues> {
  const row = await userPreferenceRepository.findByUserId(user.id);
  return row ?? DEFAULT_USER_PREFERENCES;
}

/** 未保存の User には既定値を返す (GET では行を作らない) */
export async function getPreferences(user: AuthUser): Promise<UserPreferenceDto> {
  return toDto(await findValues(user));
}

export async function updatePreferences(
  user: AuthUser,
  input: UpdatePreferenceInput,
): Promise<UserPreferenceDto> {
  // 「メインの Roadmap」に選べるのは、本人が学習を始めたものだけ
  if (input.primaryRoadmapId) {
    const started = await userRoadmapRepository.findUserRoadmapByUserAndRoadmap(
      user.id,
      input.primaryRoadmapId,
    );
    if (!started) throw notFound("USER_ROADMAP_NOT_FOUND", "User roadmap not found");
  }

  const current = await findValues(user);
  const next: UserPreferenceValues = {
    interests: input.interests ?? current.interests,
    primaryRoadmapId:
      input.primaryRoadmapId === undefined ? current.primaryRoadmapId : input.primaryRoadmapId,
    // 最初に終えた日時を残す。false を送ると未完了に戻る (やり直し用)
    onboardedAt:
      input.onboarded === undefined
        ? current.onboardedAt
        : input.onboarded
          ? (current.onboardedAt ?? new Date())
          : null,
  };
  const row = await userPreferenceRepository.upsert(user.id, next);
  return toDto(row);
}
```

**⑧ Route `src/routes/me.ts`**（末尾の `notification-preferences` の後ろに続ける）
```diff
@@ -6,6 +6,7 @@
   registerDeviceSchema,
   updateMeSchema,
   updateNotificationPreferenceSchema,
+  updatePreferenceSchema,
 } from "../schemas/me.schema";
 import {
   listMyRoadmapsQuerySchema,
@@ -19,6 +20,7 @@
 import * as deviceService from "../services/device.service";
 import * as notificationPreferenceService from "../services/notification-preference.service";
 import * as progressService from "../services/progress.service";
+import * as userPreferenceService from "../services/user-preference.service";
 import * as userService from "../services/user.service";
 
 // /me 以下はすべて「ログイン中の本人」のデータ。
@@ -99,6 +101,17 @@
       );
       return c.json(preferences, 200);
     },
-  );
+  )
+  .get("/preferences", async (c) => {
+    const preferences = await userPreferenceService.getPreferences(c.get("user"));
+    return c.json(preferences, 200);
+  })
+  .patch("/preferences", validate("json", updatePreferenceSchema), async (c) => {
+    const preferences = await userPreferenceService.updatePreferences(
+      c.get("user"),
+      c.req.valid("json"),
+    );
+    return c.json(preferences, 200);
+  });
 
 export type MeRoutes = typeof meRoutes;
```

**⑨ テストの後片付けに新テーブルを足す `tests/helpers/setup.ts`**
```diff
@@ -12,7 +12,7 @@
       users, sessions, accounts, verifications,
       books, roadmaps, roadmap_steps, user_roadmaps, user_roadmap_step_progress,
       circles, circle_members, circle_invites, circle_schedules,
-      device_push_tokens, notification_preferences
+      device_push_tokens, notification_preferences, user_preferences
     restart identity cascade
   `);
 
```

**⑩ テスト `tests/preferences.test.ts`**（新規）
```ts
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../src/db/client";
import { userPreferences } from "../src/db/schema";
import { api, createRoadmap, createUser } from "./helpers/api";

describe("User preferences", () => {
  it("未保存なら既定値を返し、行は作らない", async () => {
    const alice = await createUser("alice");
    const response = await api("GET", "/me/preferences", { as: alice });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ interests: [], primaryRoadmapId: null, onboarded: false });
    expect(await db.select().from(userPreferences)).toHaveLength(0);
  });

  it("部分更新でき、他の User には影響しない", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");

    const updated = await api("PATCH", "/me/preferences", {
      as: alice,
      json: { interests: ["ENGINEERING", "DESIGN", "ENGINEERING"], onboarded: true },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({
      interests: ["ENGINEERING", "DESIGN"],
      primaryRoadmapId: null,
      onboarded: true,
    });

    const again = await api("PATCH", "/me/preferences", { as: alice, json: { interests: [] } });
    expect(again.body).toMatchObject({ interests: [], onboarded: true });

    const bobs = await api("GET", "/me/preferences", { as: bob });
    expect(bobs.body.onboarded).toBe(false);
  });

  it("onboarded を true にし直しても、最初に終えた日時は変わらない", async () => {
    const alice = await createUser("alice");
    await api("PATCH", "/me/preferences", { as: alice, json: { onboarded: true } });
    const [first] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, alice.id));

    await api("PATCH", "/me/preferences", { as: alice, json: { onboarded: true } });
    const [second] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, alice.id));
    expect(second?.onboardedAt).toEqual(first?.onboardedAt);

    const reset = await api("PATCH", "/me/preferences", { as: alice, json: { onboarded: false } });
    expect(reset.body.onboarded).toBe(false);
  });

  it("primaryRoadmapId は開始済みの Roadmap だけ。Roadmap が消えると null に戻る", async () => {
    const alice = await createUser("alice");
    const roadmap = await createRoadmap(alice, { stepCount: 1 });

    const notStarted = await api("PATCH", "/me/preferences", {
      as: alice,
      json: { primaryRoadmapId: roadmap.id },
    });
    expect(notStarted.status).toBe(404);
    expect(notStarted.body.code).toBe("USER_ROADMAP_NOT_FOUND");

    await api("POST", `/roadmaps/${roadmap.id}/start`, { as: alice });
    const selected = await api("PATCH", "/me/preferences", {
      as: alice,
      json: { primaryRoadmapId: roadmap.id },
    });
    expect(selected.body.primaryRoadmapId).toBe(roadmap.id);

    await api("DELETE", `/roadmaps/${roadmap.id}`, { as: alice });
    const afterDelete = await api("GET", "/me/preferences", { as: alice });
    expect(afterDelete.body.primaryRoadmapId).toBeNull();
  });

  it("不正な値は 400 / 未ログインは 401", async () => {
    const alice = await createUser("alice");
    for (const json of [{ interests: ["COOKING"] }, { primaryRoadmapId: "not-a-uuid" }, {}]) {
      const response = await api("PATCH", "/me/preferences", { as: alice, json });
      expect(response.status, JSON.stringify(json)).toBe(400);
    }
    expect((await api("GET", "/me/preferences")).status).toBe(401);
  });
});
```

### 確かめ方
```sh
pnpm --filter @tadori/api typecheck
pnpm --filter @tadori/api test -- tests/preferences.test.ts
pnpm --filter @tadori/api test        # 全体（95件）
pnpm --filter @tadori/web typecheck   # Web 側から api.me.preferences が型付きで見えるか
```

実際の API で（`./scripts/local-api.sh` を起動し直してから）:
```sh
curl -s -c /tmp/cj -H "Content-Type: application/json" \
  -d '{"email":"webcheck@example.com","password":"password1234"}' \
  http://localhost:4000/api/auth/sign-in/email > /dev/null
curl -s -b /tmp/cj http://localhost:4000/me/preferences
# => {"interests":[],"primaryRoadmapId":null,"onboarded":false}
curl -s -b /tmp/cj -X PATCH -H "Content-Type: application/json" -H "Origin: http://localhost:5173" \
  -d '{"interests":["ENGINEERING"],"onboarded":true}' http://localhost:4000/me/preferences
# => {"interests":["ENGINEERING"],"primaryRoadmapId":null,"onboarded":true}
```

### 本番 DB へ適用するとき
1. `apps/api/docs/deployment.md` の手順どおり、`DATABASE_MIGRATION_URL` を本番に向けて `pnpm db:migrate`。
2. Supabase の SQL エディタで、新テーブルの権限が他と同じか確認する（`apps/api/docs/supabase.md` の「REVOKE」の節）。
3. API をデプロイ → Web / mobile から使い始める。**API を先に出す** のが順番です（逆だと、まだ無い API を呼んでエラーになる）。

### つまずきポイント
- **既定値は2か所にある**: DB の `default`（`preferences.ts`）と `DEFAULT_USER_PREFERENCES`（`types/preference.ts`）。片方だけ変えるとずれるので、コメントで「揃えること」と書いています。
- **`primaryRoadmapId` の `null` と「送らない」は別物**: `null` は「未選択に戻す」、送らない（`undefined`）は「今の値のまま」。Service で `=== undefined` と比べているのはそのためです。
- **`onboarded: true` を何度送っても、最初の日時は変わらない**: `current.onboardedAt ?? new Date()` で、既にあればそのまま使っています。
- **enum の配列の既定値**: `.default([])` ではなく ``.default(sql`'{}'`)`` にしています。Postgres の空配列リテラルをそのまま書く方が、生成される SQL が確実です。
- **`.enableRLS()`**: Supabase は Data API（テーブルを直接 HTTP で読める機能）があり、RLS が無効だと読まれる恐れがあります。API は所有者ロールで繋ぐので、RLS を有効にしても API の動作には影響しません。
- mobile 側を API に切り替えるのは別作業です（`apps/mobile/src/api/remote.ts` の `updateLocal` を呼んでいる箇所）。移行時は「端末に値があって API が空なら、一度だけ API に送る」処理を入れると、既存ユーザーの設定が消えません。
