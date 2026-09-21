# Tadori API

技術書・ビジネス書の学習ロードマップアプリ **Tadori** の Backend API。

「何を、どの順番で、どこまで読めば、何ができるようになるのか」を **Roadmap** として作成・共有・進行するための API で、
Hono + TypeScript + PostgreSQL (Drizzle ORM) + Better Auth で作られたモノリスです。

> 設計の最優先事項は性能ではなく、**AI と人間の両方が安全に変更し続けられる、明示的で小さな Backend** であることです。

---

## Architecture

1 リクエストは必ず次の順に流れます。層を飛ばさないことがこのコードベースの一番のルールです。

```
HTTP
 └─ routes/        HTTP 処理。validate して Service を呼び、JSON を返すだけ
     ├─ middleware/    Authentication (requireAuth / optionalAuth)、エラー変換、リクエストログ
     ├─ schemas/       Validation (Zod)。Request の型はここから z.infer で作る
     └─ services/      Business Logic と transaction の境界
         ├─ policies/      Authorization。「誰が何をしてよいか」は全部ここ
         ├─ repositories/  DB Access。Drizzle のクエリはここにしか書かない
         └─ dto/           Response の型と、DB の行 -> Response の変換
```

| やりたいこと | 触るファイル |
| --- | --- |
| エンドポイントを足す | `routes/*.ts` (+ `app.ts` と `client.ts` に 1 行ずつ) |
| 入力の形式・制約を変える | `schemas/*.schema.ts` |
| 「誰ができるか」を変える | `policies/*.policy.ts` |
| 振る舞いを変える | `services/*.service.ts` |
| SQL を変える | `repositories/*.repository.ts` |
| Response の形を変える | `dto/*.dto.ts` |
| テーブルを変える | `db/schema/*.ts` → `pnpm db:generate` |
| エラーコードを足す | `lib/errors.ts` の `ERROR_CODES` |

守っているルール:

- Route は Repository を直接呼ばない。Route に `if (roadmap.creatorId !== user.id)` のような認可を書かない
- Service は `c` (Hono Context) を受け取らない。受け取るのは `AuthUser` と validate 済みの入力だけ
- Repository は最後の引数で `DbExecutor` (`db` または `tx`) を受け取る。transaction を張るのは Service
- `process.env` を読むのは `lib/env.ts` だけ。ログ出力は `lib/logger.ts` だけ。Expo への通信は `lib/expo-push-client.ts` だけ
- `/me` 以下の API は URL や body から `userId` を受け取らない (常に session の本人)

## Directory Structure

```
apps/api
├── drizzle/                  生成された migration SQL (手で編集しない)
├── src
│   ├── index.ts              サーバー起動 + スケジューラ起動 + graceful shutdown
│   ├── app.ts                Hono app の組み立て。AppType (RPC 用) を export
│   ├── client.ts             Expo から使う Hono RPC クライアントと公開型
│   ├── routes/               auth / users / books / roadmaps / me / circles
│   ├── middleware/           auth.ts / error-handler.ts / request-logger.ts
│   ├── schemas/              Zod schema (Request)
│   ├── dto/                  Response DTO と mapper
│   ├── services/             roadmap / progress / circle / notification / book / user / device / notification-preference
│   ├── policies/             roadmap.policy.ts / circle.policy.ts
│   ├── repositories/         user / book / roadmap / user-roadmap / circle / device-token / notification-preference
│   ├── db/
│   │   ├── client.ts         Pool と drizzle。DbExecutor 型
│   │   ├── schema/           テーブル定義。enums.ts が Enum 値の唯一の定義元
│   │   ├── migrate.ts        pnpm db:migrate
│   │   └── seed.ts           pnpm db:seed
│   ├── lib/                  env / logger / errors / validation / pagination / auth / slug / scheduler ...
│   └── types/                AuthUser・Hono の Env 型、通知の型と既定値
└── tests/                    Vitest (実 PostgreSQL に対する API テスト)
```

## Database Schema

```
users ─┬─< roadmaps ──< roadmap_steps >── books
       │       │              │
       │       └─< user_roadmaps ──< user_roadmap_step_progress >── roadmap_steps
       ├─< user_roadmaps
       ├─< circles ─┬─< circle_members >── users
       │            ├─< circle_invites >── users
       │            └─< circle_schedules
       ├─< device_push_tokens
       └─── notification_preferences (1:1)

sessions / accounts / verifications : Better Auth が管理
```

| Table | UNIQUE / CHECK |
| --- | --- |
| `users` | `username`, `email` |
| `books` | `isbn13` (nullable。NULL は重複可) |
| `roadmaps` | `slug` |
| `roadmap_steps` | `(roadmap_id, position)` |
| `user_roadmaps` | `(user_id, roadmap_id)` |
| `user_roadmap_step_progress` | `(user_roadmap_id, roadmap_step_id)` |
| `circles` | CHECK: `BOOK` なら `book_id` のみ / `ROADMAP` なら `roadmap_id` のみ。CHECK: `max_members >= 2` |
| `circle_members` | `(circle_id, user_id)` |
| `circle_invites` | `(circle_id, invited_user_id)` |
| `device_push_tokens` | `expo_push_token`, `(user_id, device_id)` |

**ON DELETE の方針**

| 親 → 子 | 動作 | 意図 |
| --- | --- | --- |
| users → roadmaps / user_roadmaps / circles / devices ほか | CASCADE | アカウント削除でその人のデータを残さない |
| roadmaps → roadmap_steps / user_roadmaps / circles | CASCADE | Roadmap を消したら、それに紐づく進捗と Circle も消える |
| books → roadmap_steps / circles | **RESTRICT** | 使われている Book は消せない (Roadmap を壊さない) |
| user_roadmaps / roadmap_steps → step_progress | CASCADE | |

**仕様書からの追加点** (理由つき)

- `circle_invites` テーブル: 「INVITE_ONLY は招待された User のみ閲覧可」「Circle Invite 通知」を成立させるため
- `circle_schedules.reminder_sent_at`: Meeting Reminder の二重送信防止
- `device_push_tokens` の `(user_id, device_id)` UNIQUE: `POST /me/devices` の upsert キー
- timestamp はすべて `timestamptz(3)`。ミリ秒精度に揃えないと cursor の比較で行を取りこぼすため

**派生値は保存しない**: `progressPercentage` / `currentStep` / `nextStep` / `stepCount` / `memberCount` は毎回計算します。

## Authentication

[Better Auth](https://www.better-auth.com/) を `/api/auth/*` にマウントしています。設定は `src/lib/auth.ts`。

**本番のログイン方式は Apple と Google のみ**です。メール + パスワードは seed・テスト・開発用で、production では既定で無効になります。

| 用途 | Endpoint |
| --- | --- |
| 有効なログイン方式 | `GET /api/auth/methods` → `{ emailPassword, google, apple }` (ログイン画面のボタン出し分け用) |
| Apple / Google | `POST /api/auth/sign-in/social` `{ provider, idToken: { token, nonce? } }` (ネイティブ SDK で取得した ID token を渡す) |
| signup (開発用) | `POST /api/auth/sign-up/email` `{ name, email, password, username? }` |
| signin (開発用) | `POST /api/auth/sign-in/email` `{ email, password }` |
| signout | `POST /api/auth/sign-out` |
| session | `GET /api/auth/get-session` |
| current user | `GET /me` |
| アカウント削除 | `DELETE /me` |

| ログイン方式 | 有効になる条件 |
| --- | --- |
| Google | `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` がある。client ID はカンマ区切りで Web / iOS / Android を並べる (ID token の audience として全部を許可) |
| Apple | `APPLE_CLIENT_ID` (Service ID) と `APPLE_CLIENT_SECRET` がある。ネイティブの ID token は audience が bundle ID なので `APPLE_APP_BUNDLE_IDENTIFIER` も設定する |
| メール + パスワード | `AUTH_EMAIL_PASSWORD_ENABLED`。未指定なら production 以外で有効 |

メール + パスワードを本番に出さない理由: パスワードリセット・メール確認・メール送信基盤が必要になり V1 には重いためです。
ソーシャルログインの ID が揃う前に本番環境で動作確認したい場合だけ、一時的に `AUTH_EMAIL_PASSWORD_ENABLED=true` にします。

**認証情報の渡し方**は 2 通りで、どちらも同じ session を指します。

- `Authorization: Bearer <token>` — モバイル用。token は sign-in の response body (`token`) と `set-auth-token` header に入ります
- session cookie — Web、または `@better-auth/expo` クライアント

**username の後決め**: Apple / Google は username を渡してくれないので、signup 時に username が無ければ仮の値 (`user_3f9a1c07b2`) を自動採番し、
`users.username_confirmed = false` にします。`GET /me` の `usernameConfirmed` が `false` の間、アプリは onboarding で username を決めてもらい、
`PATCH /me { username }` を呼ぶと確定します。

**アカウント削除** (`DELETE /me`): App Store の審査要件です。本人の Roadmap・Circle・進捗・端末・session まで FK の CASCADE で消えます。
Sign in with Apple を有効にしたら、Apple 側の token revoke もここに追加してください (Future Extension Points)。

- `users` テーブルが Better Auth の user と Tadori の User を兼ねます (`username`, `bio` を追加、`image` は `avatarUrl` にマッピング)
- `username` は signup 時に形式 (`a-z 0-9 _` の 3〜30 文字) と重複を検証。最終保証は DB の UNIQUE
- Expo 連携用に `@better-auth/expo` plugin を有効化し、`APP_SCHEME://` を trustedOrigins に入れています。
  モバイルは `better-auth/react` + `@better-auth/expo/client` を使い、session cookie を SecureStore に保存します
- Middleware (`src/middleware/auth.ts`)
  - `requireAuth`: 未ログインなら 401。`c.get("user")` は必ず `AuthUser`
  - `optionalAuth`: 未ログインでも通す。`c.get("viewer")` は `AuthUser | null`

## Authorization

認可の条件式は `src/policies/` にしかありません。Service は `assert〜` を呼ぶだけです。

| 対象 | ルール | 違反時 |
| --- | --- | --- |
| Roadmap 閲覧 | PUBLIC: 誰でも / UNLISTED: slug を知っていれば / PRIVATE: creator のみ | 404 (存在を隠す) |
| Roadmap・Step の編集/削除/並べ替え | creator のみ | 403 (閲覧もできない場合は 404) |
| UserRoadmap / Step Progress | 本人のみ | 404 |
| Circle 閲覧 | PUBLIC: 誰でも / INVITE_ONLY: メンバーか招待された User | 404 |
| Circle 参加 | PUBLIC: 誰でも / INVITE_ONLY: 招待された User | 403 / 404 |
| Circle 更新/削除/招待/Schedule 編集 | OWNER のみ | 403 |
| Circle 退出 | MEMBER のみ (OWNER は不可。V1 では Circle を削除する) | 409 |
| Device Push Token / Notification Preference | 本人のみ (`/me` 配下で userId を受け取らない) | - |

情報漏洩を防ぐための追加ルール:

- 一覧 (`GET /roadmaps`, `GET /circles`)・公開 Profile・Book Detail には PUBLIC のものしか出さない
- PUBLIC Circle は PRIVATE Roadmap を対象にできない (Circle 経由でタイトルが漏れるため)
- DTO に `email` と `expoPushToken` を含めない (`GET /me` の email を除く)

## API Routes

エラーはすべて `{ "code": "ROADMAP_NOT_FOUND", "message": "..." }` の形式です。
Zod のエラーは `code: "VALIDATION_ERROR"` になり、`details: [{ path, message }]` が付きます。コード一覧は `src/lib/errors.ts`。

🔒 = 認証必須

**Users / Me**

| Method | Path | 説明 |
| --- | --- | --- |
| GET | `/users/:username` | 公開 Learning Profile (`user` / `stats` / `currentRoadmaps` / `completedRoadmaps` / `createdRoadmaps`) |
| GET 🔒 | `/me` | current user |
| PATCH 🔒 | `/me` | `name` / `username` / `bio` / `avatarUrl`。username を送ると `usernameConfirmed` が true になる |
| DELETE 🔒 | `/me` | アカウント削除 |

**Books**

| Method | Path | 説明 |
| --- | --- | --- |
| GET | `/books?q&limit&cursor` | title・author は部分一致、isbn13 は前方一致 |
| POST 🔒 | `/books` | |
| GET | `/books/:id` | `publicRoadmaps` (最大 10 件) を含む |

**Roadmaps**

| Method | Path | 説明 |
| --- | --- | --- |
| GET | `/roadmaps?q&category&difficulty&creator&limit&cursor` | PUBLIC のみ。`creator` は username |
| GET | `/roadmaps/:slug` | Step は position 順。ログイン中で開始済みなら `userProgress` 付き |
| POST 🔒 | `/roadmaps` | slug は title から自動生成。既定の visibility は PRIVATE |
| PATCH 🔒 | `/roadmaps/:id` | slug は変わらない |
| DELETE 🔒 | `/roadmaps/:id` | |
| POST 🔒 | `/roadmaps/:id/start` | 最初の Step が READING になる |
| POST 🔒 | `/roadmaps/:id/steps` | 末尾に追加。`checkpoint` 必須 |
| PATCH 🔒 | `/roadmaps/:id/steps/reorder` | body は全 Step を含むこと。position は 1..n に正規化 |
| PATCH 🔒 | `/roadmaps/:id/steps/:stepId` | |
| DELETE 🔒 | `/roadmaps/:id/steps/:stepId` | 後ろの position を詰める |

Step 系の API は変更後の全 Step を `{ steps: [...] }` で返します。

**My Roadmaps / Progress** (すべて 🔒)

| Method | Path | 説明 |
| --- | --- | --- |
| GET | `/me/roadmaps?status` | `progressPercentage` / `currentStep` / `nextStep` は派生値 |
| PATCH | `/me/roadmaps/:userRoadmapId` | `{ status: "PAUSED" \| "IN_PROGRESS" }` |
| PATCH | `/me/roadmaps/:userRoadmapId/steps/:stepId` | `{ status?, progressType?, progressValue? }` |

進捗更新のルール (`progress.service.ts`):
Step を COMPLETED にすると、後ろにある最初の未完了 Step が READING になります。全 Step が COMPLETED になると UserRoadmap が COMPLETED になり、完了済み Step を戻すと IN_PROGRESS に戻ります。すべて 1 transaction で、UserRoadmap 行をロックして直列化しています。

**Circles**

| Method | Path | 説明 |
| --- | --- | --- |
| GET | `/circles?q&targetType&roadmapId&bookId&limit&cursor` | PUBLIC のみ |
| GET | `/circles/:id` | `target` / `members` / `schedules` / `viewer` |
| GET 🔒 | `/me/circles` | 参加中の Circle (INVITE_ONLY を含む) |
| POST 🔒 | `/circles` | 作成者は OWNER として参加 |
| PATCH 🔒 / DELETE 🔒 | `/circles/:id` | OWNER のみ。対象 (Book/Roadmap) は変更不可 |
| POST 🔒 | `/circles/:id/join` | Circle 行をロックして `maxMembers` を保証 |
| POST 🔒 | `/circles/:id/leave` | |
| POST 🔒 | `/circles/:id/invites` | `{ username }` OWNER のみ |
| POST 🔒 | `/circles/:id/schedules` | OWNER のみ |
| PATCH 🔒 / DELETE 🔒 | `/circles/:id/schedules/:scheduleId` | OWNER のみ |

**Devices / Notification Preferences** (すべて 🔒)

| Method | Path | 説明 |
| --- | --- | --- |
| POST | `/me/devices` | `{ expoPushToken, platform, deviceId }` upsert |
| DELETE | `/me/devices/:deviceId` | 無効化 (ログアウト時に呼ぶ) |
| GET / PATCH | `/me/notification-preferences` | 未保存なら既定値を返す。PATCH は部分更新 |

**Cursor Pagination**: `GET /books` `/roadmaps` `/circles` は `{ items, nextCursor }` を返します。
並びは `(createdAt DESC, id DESC)` 固定で、cursor は最後の行の `(createdAt, id)` を base64url にした不透明な文字列です (`src/lib/pagination.ts`)。`limit` は 1〜50 (既定 20)。

アプリ (`apps/mobile`) の繋ぎ込み方は [docs/mobile-integration.md](docs/mobile-integration.md) にまとめています。

## Hono RPC usage

`src/client.ts` が Expo 向けの入口です (`package.json` の `exports["./client"]`)。

```ts
import { createApiClient, type RoadmapSummaryDto } from "@tadori/api/client";
import { authClient } from "./auth-client"; // better-auth + @better-auth/expo/client

export const api = createApiClient(process.env.EXPO_PUBLIC_API_URL!, {
  headers: () => ({ cookie: authClient.getCookie() }),
});

const res = await api.roadmaps.index.$get({ query: { category: "ENGINEERING" } });
if (!res.ok) {
  const error = (await res.json()) as ErrorResponseBody; // { code, message }
}
const { items, nextCursor } = await res.json(); // items: RoadmapSummaryDto[]

await api.me.roadmaps[":userRoadmapId"].steps[":stepId"].$patch({
  param: { userRoadmapId, stepId },
  json: { status: "COMPLETED" },
});
```

- **型推論を重くしない工夫**: `AppType` 全体から 1 つの client を作らず、route 単位 (`UsersRoutes`, `BooksRoutes`, ...) の小さな client を束ねています。route ファイルを足したら `app.ts` と `client.ts` に 1 行ずつ追加します
- route は必ず**メソッドチェーン**で定義します (チェーンを切ると RPC の型が失われます)
- Response の型は `dto/` の明示的な型です。Date は ISO 文字列に変換済みなので、サーバーとクライアントで型がずれません
- `tests/rpc-client.test.ts` が、この client で実際に API を呼べることを確認しています

## Push Notification architecture

```
progress.service / circle.service ──> notification.service.ts ──> lib/expo-push-client.ts ──> Expo Push API
        (イベント関数を呼ぶだけ)          │
                                          ├─ notifyRoadmapCompleted / notifyNextStepAvailable
                                          ├─ notifyCircleInvite / notifyCircleJoined
                                          ├─ sendDueCircleMeetingReminders   <- lib/scheduler.ts (1 分ごと)
                                          │
                                          ├─ sendPushToUser / sendPushToCircle   宛先解決 (通知設定で絞り込み → 有効な token)
                                          └─ sendPushNotification                送信 (100 件ずつ)
```

- Route や他の Service は Expo API を直接叩きません。`notification.service.ts` のイベント関数だけを呼びます
- 通知は **transaction の commit 後**に送ります。送信に失敗しても本処理 (進捗更新など) は失敗しません (notification.service は throw しない)
- Expo が `DeviceNotRegistered` を返した token は自動で無効化します
- Message Queue は使いません。Meeting Reminder はプロセス内タイマーで、開催 60 分前以内の Schedule を `UPDATE ... RETURNING` で原子的に確保してから送るため、複数インスタンスでも二重送信しません
- テストでは `vi.spyOn(expoPushClient, "send")` で外部送信を mock しています (`tests/helpers/setup.ts`)

| 通知 (`data.type`) | 宛先 | ON/OFF する設定 |
| --- | --- | --- |
| `CIRCLE_MEETING_REMINDER` | Circle の全メンバー | `circleReminderEnabled` |
| `CIRCLE_JOIN` | 参加者以外のメンバー | `circleReminderEnabled` |
| `CIRCLE_INVITE` | 招待された User | `inviteNotificationEnabled` |
| `ROADMAP_COMPLETED` / `NEXT_STEP_AVAILABLE` | 本人 | `progressNotificationEnabled` |

対応表は `src/types/notification.ts` の `PREFERENCE_KEY_BY_TYPE` にあります。

**Push Token の扱い**: token は全体で UNIQUE。他の User が*有効な状態で*持っている token は登録できません (409 `PUSH_TOKEN_IN_USE`)。
同じ端末で A がログアウト (`DELETE /me/devices/:deviceId`) した後に B がログインした場合は、無効化済みなので引き継げます。

## Local Notification との責務分担

| | 担当 | 内容 |
| --- | --- | --- |
| 学習リマインダー (毎日 20:00 など) | **モバイル端末** | `expo-notifications` の Local Notification として端末がスケジュールする。サーバーは送らない |
| リマインダー設定の保存 | **Backend** | `studyReminderEnabled` / `studyReminderTime` / `studyReminderTimezone` を保存するだけ |
| 機種変更・再インストール | 両方 | 起動時に `GET /me/notification-preferences` → その値で端末が Local Notification を再スケジュール |
| 他人やサーバー起点の出来事 | **Backend** | Circle 系・Roadmap 完走などを Expo Push で送る |

端末がオフラインでも学習リマインダーは鳴り、サーバーは「誰に何時に送るか」というスケジューリングを持たずに済みます。

## Environment Variables

起動時に `src/lib/env.ts` が Zod で検証し、不足・不正があれば即座に終了します (値はログに出しません)。

| Name | 必須 | 既定 | 説明 |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✔ | | PostgreSQL 接続文字列 |
| `BETTER_AUTH_SECRET` | ✔ | | 32 文字以上。`openssl rand -base64 32` |
| `BETTER_AUTH_URL` | ✔ | | API の公開 URL (例 `http://localhost:4000`) |
| `CORS_ORIGIN` | | (なし) | カンマ区切り。Web クライアント用 |
| `APP_SCHEME` | | `tadori` | Expo の deep link scheme |
| `EXPO_ACCESS_TOKEN` | | | Expo Push の Enhanced Security 利用時のみ |
| `AUTH_EMAIL_PASSWORD_ENABLED` | | production 以外で `true` | メール + パスワードログイン |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | | | 両方あれば Google ログイン有効。ID はカンマ区切りで複数可 |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | | | 両方あれば Apple ログイン有効 |
| `APPLE_APP_BUNDLE_IDENTIFIER` | | | iOS アプリの bundle ID (`app.tadori.mobile`) |
| `PORT` | | `4000` | |
| `NODE_ENV` | | `development` | `development` / `test` / `production` |
| `LOG_LEVEL` | | NODE_ENV による | `debug` / `info` / `warn` / `error` / `silent` |

Logging: development は読みやすい 1 行、production は JSON 1 行、test は silent。リクエストログは method / path / status / 所要時間のみで、header・cookie・body・token は記録しません。

## Development Setup

必要なもの: Node.js 22+ / pnpm / PostgreSQL (ローカル、または付属の docker compose)

```bash
cd apps/api
pnpm install
cp .env.example .env          # BETTER_AUTH_SECRET を書き換える
docker compose up -d db       # ローカルの PostgreSQL を使うなら不要 (DATABASE_URL を合わせる)
pnpm db:migrate
pnpm db:seed
pnpm dev                      # http://localhost:4000  (GET /health)
```

## Migration Commands

```bash
pnpm db:generate   # src/db/schema の変更から drizzle/*.sql を生成
pnpm db:migrate    # 未適用の migration を DATABASE_URL の DB に適用
pnpm db:studio     # Drizzle Studio
```

schema を変えたら `db:generate` → 生成された SQL をレビュー → `db:migrate`。生成済みの SQL は編集しません。

## Seed Commands

```bash
pnpm db:seed
```

- Users: `alice` / `bob` / `carol` (`<username>@example.com` / パスワード `password-1234`)
- Roadmaps: **Backend Engineering Foundations** (alice)、**Product Management Basics** (bob)。各 4 Step・Checkpoint つき
- Circles: Roadmap Circle 1 件 (Schedule つき)、Book Circle 1 件
- 既に seed 済みなら何もしません。production では実行を拒否します

## Test Commands

```bash
pnpm test          # 全テスト
pnpm test:watch
pnpm typecheck
```

- 実 PostgreSQL に対して API を叩くテストです。既定の接続先は `postgres://localhost:5432/tadori_test` (`TEST_DATABASE_URL` で変更可。docker compose の場合は `postgres://tadori:tadori@localhost:5432/tadori_test`)
- テスト用 DB の作成と migration は自動です。DB 名に `test` を含まない接続先では実行を拒否します
- 各テストの前に全テーブルを truncate します。DB を共有するためファイル並列実行は無効です
- カバー範囲: Auth Middleware / Bearer token / 仮 username と確定 / アカウント削除 / ログイン方式の切り替え / Roadmap CRUD / Visibility / Step Reorder / Start / Progress Update / Completion / Circle Create・Join・Max Members (同時参加を含む)・Authorization / Notification Preference / Device Push Token / Push 送信 (mock) / Cursor Pagination / Hono RPC client

## Future Extension Points

| やりたいこと | 入れる場所 |
| --- | --- |
| Rate Limit | `app.ts` の middleware 欄にコメントで位置を示してあります (例: `hono-rate-limiter`)。まず `/api/auth/*` から |
| 外部 Book API からの取り込み | `services/book.service.ts` に import 関数を追加。`books.externalSource / externalId` は用意済み |
| Apple の token revoke | Sign in with Apple を有効にしたら、`user.service.ts` の `deleteCurrentUser` で Apple の revoke API を呼ぶ (審査要件) |
| Apple の client secret の自動更新 | `APPLE_CLIENT_SECRET` は最長 6 か月で失効する JWT。`.p8` から起動時に生成する形にすると更新作業が不要になる |
| Circle の Ownership 移行 | `circle.policy.ts` + `circle.service.ts` の `leaveCircle` |
| 招待の辞退・一覧 | `circle_invites` に status を足す |
| Roadmap の soft delete / Fork | 現状は CASCADE で進捗ごと消えます。`roadmaps.deletedAt` の追加を想定 |
| 通知の本格化 | `notification.service.ts` のイベント関数の中身を Queue への enqueue に差し替える (呼び出し側は変更不要)。Expo の receipt 確認もここ |
| スケジューラの外出し | `sendDueCircleMeetingReminders()` を外部 cron から呼ぶ形にして `lib/scheduler.ts` を削除 |

**V1 では作らないもの**: AI / MCP / Recommendation / EPUB・PDF Reader / Chat / Feed / Like / Follow / Review / Rating / Payment / WebSocket / Message Queue / Microservices。
