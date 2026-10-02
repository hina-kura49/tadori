# Mobile ⇄ API 繋ぎ込みガイド

`apps/mobile` は現在、`EXPO_PUBLIC_API_URL` が未設定なら端末内の Mock (`src/api/repository.ts` の `mutate`) で動き、
設定すると `/v1/...` を呼ぶ作りになっています。しかし **その `/v1/...` は `apps/api` に存在しません**。
このドキュメントは、アプリの `repository` の各関数を実際の API にどう対応させるかの対応表です。

(2026-09-21 時点の `apps/mobile/src/api/repository.ts`・`src/types/domain.ts`・ルートの `docs/api-contract.md` を元にしています)

## 実装状況 (2026-09-21)

繋ぎ込みは実装済みです。`EXPO_PUBLIC_API_URL` を設定するとアプリは実 API を使い、未設定なら従来どおり端末内 Mock で動きます。

| アプリ側のファイル | 役割 |
| --- | --- |
| `src/api/repository.ts` | 入口。`apiUrl` があれば `remote`、無ければ Mock |
| `src/api/remote.ts` | 実 API を呼ぶ repository (この文書の対応表の実装) |
| `src/api/mappers.ts` | API の DTO ⇄ アプリの domain model (純粋関数。`tests/mappers.test.ts`) |
| `src/api/remoteTypes.ts` | API の Response 型の写し。正は `apps/api/src/dto/` |
| `src/api/localState.ts` | API に保存しない端末内の状態 (interests / メイン Roadmap / リマインドの曜日 / 端末内の画像) |
| `src/api/client.ts` | `ApiError` (`status` / `code`)、エラー文言、401 で token を破棄 |
| `src/lib/auth.ts` / `src/features/Login.tsx` | ログイン・登録・ログアウト・アカウント削除 |
| `app/_layout.tsx` | 401 なら `/login` へ、`usernameConfirmed = false` なら `/onboarding` へ |

読み取りは §3 の案 A をサーバー側に寄せ、**`GET /me/dashboard`** を追加しました (アプリ側で何十回も API を呼ぶ代わりに、サーバーで少数のクエリにまとめる)。
中身は既存の DTO の組み合わせです: 見える Roadmap (Step つき) / 自分の進捗 / Book / Circle (メンバー・次の Schedule つき) / 通知設定。
メンバーの進捗は、自分も参加している Circle でだけ共有されます。

まだ繋がっていないもの: Apple / Google ログインのボタン (ネイティブ SDK が必要)、画像 upload、Circle の `announcement`、Web 版 + API (cookie が cross-site になるため同一サイトでの配信が必要)。

### 実機で動かす

```bash
# 1. API (apps/api)
pnpm dev                                   # http://<Mac の LAN IP>:4000

# 2. アプリの開発サーバー (apps/mobile)。.env には書かず、このプロセスにだけ渡す
#    (.env に書くと Mock 前提の e2e テストや他の開発サーバーまで API モードになる)
EXPO_PUBLIC_API_URL=http://<Mac の LAN IP>:4000 npx expo start --port 8081

# 3. iPhone に入れる (初回と、7 日ごとの期限切れ時。無料の Personal Team の場合)
npx expo prebuild --platform ios           # ios/ を生成 (git 対象外)。package.json の scripts が書き換わるので戻す
#   Personal Team では Push / Associated Domains が使えないため、
#   ios/Tadori/Tadori.entitlements の中身を空の <dict/> にする
xcodebuild -workspace ios/Tadori.xcworkspace -scheme Tadori -configuration Debug \
  -destination "id=<iPhone の UDID>" -derivedDataPath ios/build/dd -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=<Team ID> CODE_SIGN_STYLE=Automatic IPHONEOS_DEPLOYMENT_TARGET=16.4 build
xcrun devicectl device install app --device <UDID> ios/build/dd/Build/Products/Debug-iphoneos/Tadori.app
```

`IPHONEOS_DEPLOYMENT_TARGET=16.4` は Expo SDK 55 + Xcode 27 の組み合わせで必要です (一部の pod が iOS 15 未満を指定していてエラーになり、
expo-router は iOS 16 の API を使っているため)。Expo Go は最新 SDK 専用なので、SDK 55 のこのアプリは開けません。
UDID は `xcrun devicectl list devices`、Team ID は Xcode の Settings → Accounts で確認できます。

## 0. 契約が 2 つある問題と、その結論

| | `docs/api-contract.md` (アプリ側が書いた想定) | `apps/api` (実装済み・テスト済み) |
| --- | --- | --- |
| パス | `/v1/...` | `/roadmaps` `/me/...` など。`/v1` prefix なし |
| 読み取り | `GET /v1/me/dashboard` で `Database` 全体を 1 回で取得 | リソースごと。一覧は cursor pagination |
| 書き込み | `PUT` で全置換。response は ID 文字列か 204 | `PATCH` で部分更新。response は更新後の DTO |
| 進捗のキー | `roadmapId` + `stepId` | `userRoadmapId` + `stepId` |
| Circle のメンバー | 表示名の配列 (契約書自身が「user ID に移行する想定」と明記) | user ID ベース。`{ role, user: { id, name, username } }` |
| 画像 upload | `POST /v1/uploads/book-cover` / `profile-avatar` (契約書自身が「未実装の想定」と明記) | **無い** |
| 認証 | 「別途実装」 | 実装済み (Bearer / cookie、Apple・Google・開発用メール) |
| 認可・整合性 | 「サーバー側で検証してください」 | 実装済み (policies/ と DB 制約) |

**結論: `apps/api` を正とし、アプリ側に adapter を 1 枚入れる。** 理由:

- `api-contract.md` は Mock をそのまま HTTP にした形で、`Database` 丸ごと取得・表示名ベースのメンバー・全置換 PUT は、
  実データ (他人の Roadmap や Circle が増える) では成立しません。契約書自身もそれを前提に「移行する想定」と書いています
- API 側に `/v1` の互換レイヤーを作る案もありますが、エンドポイントが二重になり「小さく明示的な Backend」の方針に反します
- アプリは `Route → Feature → hook → Repository` の構造なので、**差し替えるのは `src/api/repository.ts` の 1 ファイルだけ**で、画面は無変更で済みます

繋ぎ込みが済んだら `docs/api-contract.md` は削除するか、このファイルへのリンクに置き換えてください (契約が 2 つ残ると次の AI が迷います)。

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
| `createBook` (`POST /v1/books`) | `POST /books` | `coverUri` → `coverImageUrl` (https の URL のみ)。`color` / `shortTitle` は UI 専用。response は ID 文字列ではなく `BookDto` (`.id` を使う) |
| 画像 upload (`POST /v1/uploads/book-cover` / `profile-avatar`) | **該当なし** → 「5.」参照 | API 未接続の間は、画像は端末内保存のままにする |
| `createRoadmap` (`POST /v1/roadmaps`) | `POST /roadmaps` → Step ごとに `POST /roadmaps/:id/steps` | 下の「4. 値の変換」。response の `.slug` を返す |
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
| `Profile.avatarUri` | `avatarUrl` (https の URL のみ。端末内ファイルの URI は送れない) |
| `Profile.username` (3〜24 文字) | 3〜30 文字。アプリ側の制限のほうが厳しいので問題なし |
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

## 4.5 Push 通知の payload

アプリは通知タップ時に **`data.url` だけ**を見て遷移します (`src/lib/links.ts` の `notificationPath`)。API はこれに合わせ、全通知に `data.url` を入れています。

| API の `data.type` | `data.url` | `api-contract.md` での名前 |
| --- | --- | --- |
| `CIRCLE_MEETING_REMINDER` | `readtree://circles/:id` | `circle_meeting` |
| `CIRCLE_JOIN` | `readtree://circles/:id` | `member_joined` |
| `CIRCLE_INVITE` | `readtree://circles/:id` | `circle_invited` |
| `ROADMAP_COMPLETED` | `readtree://roadmaps/:slug` | `roadmap_completed` |
| `NEXT_STEP_AVAILABLE` | `readtree://roadmaps/:slug` | `next_book` |
| (未実装) | | `circle_start` (Circle の開始日の通知) |

アプリは `type` を参照していないので名前の違いは実害なし。`type` で分岐するようになったら API 側の名前 (大文字) に合わせてください。

`registerPush` には注意点が 2 つあります: `getExpoPushTokenAsync` は EAS の `projectId` が無いと何もしない実装になっている (`app.json` に `extra.eas.projectId` が必要)、
そして Expo Go では remote push が使えない (development build が必要) ことです。

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
| 画像 upload (Book の表紙 / Profile の avatar) | 要設計。保存先 (Cloudflare R2 / S3 など) と、契約書にある所有者・サイズ・MIME の検証が必要。決まるまでは端末内保存のままにし、API へは画像を送らない |
| `circle_start` 通知 | 後回しでよい。足すなら `sendDueCircleMeetingReminders` と同じ形 (`circles.start_date` を見る) |

## 6. 実機から開発中の API に繋ぐ

```bash
# apps/api/.env
BETTER_AUTH_URL=http://<Mac の LAN IP>:4000

# apps/mobile/.env
EXPO_PUBLIC_API_URL=http://<Mac の LAN IP>:4000
```

Mac とスマホを同じ Wi-Fi に繋ぎます。LAN IP は `ipconfig getifaddr en0` で確認できます。
Apple / Google ログインは Expo Go では検証できません (ID token の audience が Expo Go のものになる)。development build が必要です。
