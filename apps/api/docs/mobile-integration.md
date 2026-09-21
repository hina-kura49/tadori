# Mobile ⇄ API 繋ぎ込みガイド

`apps/mobile` は現在、`EXPO_PUBLIC_API_URL` が未設定なら端末内の Mock (`src/api/repository.ts` の `mutate`) で動き、
設定すると `/v1/...` を呼ぶ作りになっています。しかし **その `/v1/...` は `apps/api` に存在しません**。
このドキュメントは、アプリの `repository` の各関数を実際の API にどう対応させるかの対応表です。

(2026-09-21 時点の `apps/mobile/src/api/repository.ts` と `src/types/domain.ts` を元にしています)

## 1. 認証

アプリの `src/api/client.ts` は `Authorization: Bearer <token>` を送る実装で、API はこれに対応済みです。

| やること | API |
| --- | --- |
| ログイン画面に出すボタンを決める | `GET /api/auth/methods` → `{ emailPassword, google, apple }` |
| Apple / Google ログイン | ネイティブ SDK で ID token を取得 → `POST /api/auth/sign-in/social` `{ provider, idToken: { token, nonce? } }` |
| (開発用) メールで登録 / ログイン | `POST /api/auth/sign-up/email` `{ name, email, password }` / `POST /api/auth/sign-in/email` |
| token の保存 | response body の `token` (または `set-auth-token` header) を `session.setToken()` へ |
| ログアウト | `DELETE /me/devices/:deviceId` → `POST /api/auth/sign-out` → token を破棄 |
| アカウント削除 | `DELETE /me` (App Store の審査要件。設定画面に置く) |

**onboarding との接続**: `GET /me` の `usernameConfirmed` が `false` なら、username は自動採番された仮のもの (`user_3f9a...`) です。
`app/onboarding.tsx` で username を決めてもらい `PATCH /me { name, username, bio }` を呼ぶと `true` になります。
アプリの `Profile.onboarded` はこの値から作れます。

## 2. repository 関数の対応表

| アプリの関数 (現在の呼び先) | 実際の API | 変換 |
| --- | --- | --- |
| `getDashboard` (`GET /v1/me/dashboard`) | **該当なし** → 下の「3. Dashboard」 | |
| `saveProfile` (`PUT /v1/me`) | `PATCH /me` | `{ name, username, bio }` のみ。`interests` は API に無い |
| `enroll` (`POST /v1/enrollments`) | `POST /roadmaps/:id/start` | response の `userRoadmapId` を保持する |
| `progress` (`PUT /v1/enrollments/:roadmapId/steps/:stepId`) | `PATCH /me/roadmaps/:userRoadmapId/steps/:stepId` | **roadmapId ではなく userRoadmapId**。body は `{ status, progressType: "PERCENTAGE", progressValue: "42" }` (文字列) |
| `setPrimary` (`PUT /v1/me/primary-roadmap`) | **該当なし** | 端末内 (AsyncStorage) に保持するのが簡単 |
| `createBook` (`POST /v1/books`) | `POST /books` | `coverUri` → `coverImageUrl` (https の URL のみ。画像アップロード API は無い)。`color` / `shortTitle` は UI 専用 |
| `createRoadmap` (`POST /v1/roadmaps`) | `POST /roadmaps` → Step ごとに `POST /roadmaps/:id/steps` | 下の「4. 値の変換」 |
| `createCircle` (`POST /v1/circles`) | `POST /circles` (+ `POST /circles/:id/schedules`) | 下の「4. 値の変換」 |
| `joinCircle` (`POST /v1/circles/:id/members`) | `POST /circles/:id/join` | |
| `settings` (`PUT /v1/me/notification-settings`) | `PATCH /me/notification-preferences` | 下の「4. 値の変換」 |
| `registerPush` (`POST /v1/me/devices` `{ token }`) | `POST /me/devices` | `{ expoPushToken, platform: "IOS" \| "ANDROID", deviceId }`。`deviceId` は端末ごとに固定の値を SecureStore に保存して使う |

エラーは常に `{ code, message }`。`client.ts` は現在 status しか見ていないので、`code` で分岐すると
「満員 (`CIRCLE_FULL`)」「開始済み (`ROADMAP_ALREADY_STARTED`)」などを正しく表示できます。

## 3. Dashboard (一番大きな差分)

アプリは起動時に `Database` 全体 (profile / roadmaps / books / enrollments / circles / notifications) を 1 回で取得する設計ですが、
API はリソースごとです。どちらかを選ぶ必要があります。

- **A. アプリ側で組み立てる (API 変更なし)**: `GET /me` + `GET /me/roadmaps` + `GET /roadmaps` + `GET /me/circles` + `GET /circles` + `GET /me/notification-preferences` を並列に呼び、`Database` の形に詰め替える adapter を `src/api/` に置く。画面側は無変更で済む
- **B. 画面ごとに取得する**: Explore は `GET /roadmaps` (cursor pagination)、詳細は `GET /roadmaps/:slug` … と画面単位で呼ぶ。件数が増えても破綻しないが、`useTadori` の作り直しが必要

V1 は A で始め、Explore だけ B (pagination) にするのが現実的です。`src/client.ts` の Hono RPC クライアント
(`createApiClient`) を使うと、adapter の入力側が型付きになります。

## 4. 値の変換

| アプリ | API |
| --- | --- |
| `category: "Engineering"` | `"ENGINEERING"` (大文字。API には `OTHER` もある) |
| `difficulty: "Beginner"` | `"BEGINNER"` |
| `Roadmap.duration: string` / `Step.duration: string` | `estimatedDays: number \| null` |
| `Step.why` | `description` |
| `Roadmap.creator` / `creatorUsername` | `creator: { name, username, avatarUrl }` |
| `Roadmap.completedUsers` | **API に無い** (必要なら集計を追加する) |
| `Enrollment.progress[stepId] = { percentage, status }` | `userProgress.steps[] = { stepId, status, progressType, progressValue }` |
| `Circle.targetType: "Book"` + `targetId` | `targetType: "BOOK"` + `bookId` または `roadmapId` |
| `Circle.endDate` | `targetEndDate` |
| `Circle.meeting: string` | `circle_schedules` (`POST /circles/:id/schedules` `{ title, scheduledAt }`) |
| `Circle.members: string[]` (名前) | `members: [{ role, joinedAt, user: { name, username } }]` |
| `Circle.announcement` / `memberProgress` / `progress` / `currentStep` | **API に無い** |
| `NotificationSettings.study` / `time` | `studyReminderEnabled` / `studyReminderTime` (+ `studyReminderTimezone` が必須級) |
| `NotificationSettings.circle` / `progress` / `invite` | `circleReminderEnabled` / `progressNotificationEnabled` / `inviteNotificationEnabled` |
| `NotificationSettings.weekdays` / `roadmapId` | **API に無い**。Local Notification の設定なので端末内に保持でよい |

## 5. API 側に足すか決める必要があるもの

アプリにあって API に無い項目です。端末内に持つか、API に足すかを決めてください。

| 項目 | おすすめ |
| --- | --- |
| `Profile.interests` | 端末内。推薦機能は V1 の対象外のためサーバーで使い道がない |
| primary roadmap | 端末内 |
| `weekdays` / リマインド対象 Roadmap | 端末内 (Local Notification は端末の責務) |
| `Roadmap.completedUsers` | API に追加 (`user_roadmaps` の COUNT。`stepCount` と同じ形で足せる) |
| Circle の `memberProgress` (メンバーごとの進捗) | API に追加。Roadmap Circle なら `user_roadmaps` から導出できる。Book Circle は設計が必要 |
| Circle の `announcement` | API に追加 (`circles.announcement` 列) |
| Book の表紙画像アップロード | 要設計 (保存先のストレージが必要)。V1 は URL 指定のみでも成立する |

## 6. 実機から開発中の API に繋ぐ

```bash
# apps/api/.env
BETTER_AUTH_URL=http://<Mac の LAN IP>:4000

# apps/mobile/.env
EXPO_PUBLIC_API_URL=http://<Mac の LAN IP>:4000
```

Mac とスマホを同じ Wi-Fi に繋ぎます。LAN IP は `ipconfig getifaddr en0` で確認できます。
Apple / Google ログインは Expo Go では検証できません (ID token の audience が Expo Go のものになる)。development build が必要です。
