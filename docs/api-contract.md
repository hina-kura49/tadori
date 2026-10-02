# Readtree frontend → Hono API contract

`EXPO_PUBLIC_API_URL`をbase URLとし、すべてJSON（画像uploadのみmultipart/form-data）。NativeはBearer token、Webはcredential付きsession cookieを利用します。認証フローは別途サーバー接続時に実装してください。

| Method / Path | Request | Response |
| --- | --- | --- |
| GET `/v1/me/dashboard` | — | `Database` snapshot |
| PUT `/v1/me` | `Profile` | 保存した`Profile` |
| POST `/v1/books` | `BookInput` | 作成したIDのJSON string |
| POST `/v1/uploads/book-cover` | multipart `file` | `{ "url": "https://..." }` |
| POST `/v1/enrollments` | `{ roadmapId }` | 204 |
| PUT `/v1/me/primary-roadmap` | `{ roadmapId }` | 204 |
| PUT `/v1/enrollments/:roadmapId/steps/:stepId` | `{ percentage, status }` | 204 |
| POST `/v1/roadmaps` | `RoadmapInput` | 作成したslugのJSON string |
| POST `/v1/circles` | `CircleInput` | 作成したIDのJSON string |
| POST `/v1/circles/:id/members` | — | 204 |
| PUT `/v1/me/notification-settings` | `NotificationSettings` | 204 |
| POST `/v1/me/devices` | `{ token }` | 204 |

HTTPエラーは2xx以外。401では再ログイン案内、それ以外では再試行案内を表示します。JSON requestは12秒、画像uploadは20秒でタイムアウト。Mutation後はdashboardをinvalidateして再取得します。

`Database`の`version`は1。フィールドは`apps/mobile/src/types/domain.ts`を参照。書籍の`coverUri`は省略可能で、外部書影の検索・取得はしません。実サーバーではユーザーがアップロードした画像URLを返します。

サーバー側でPUBLIC / UNLISTED / PRIVATE、INVITE_ONLY、ユーザー本人、StepとRoadmapの関連、画像所有者・サイズ・MIME、Circle人数上限を検証してください。IDとcreatorは認証情報から生成し、フロントから信頼しません。Mockの表示名ベースのCircleメンバーは実APIではuser IDに移行する想定です。

Push payload例：

```json
{
  "to": "ExponentPushToken[...]",
  "title": "Circleの時間です",
  "body": "Backend, together. は20:00からです。",
  "data": { "url": "readtree://circles/backend-circle", "type": "circle_meeting" }
}
```

`circle_start`、`circle_meeting`、`roadmap_completed`、`next_book`、`member_joined`、`circle_invited`などのイベントはbackendのjobで配信し、通知設定に従って抑制します。スケジュールの変更・中止・重複配信防止はbackendの責務です。

Circle snapshotは任意の`memberProgress: Record<string, { step: number; percentage: number }>`（stepは0-based）に対応しました。未共有メンバーのentryは省略します。Mockでは表示名をkeyにしますが、実API接続ではmembersとともに安定したuser IDに揃える必要があります。

プロフィールのデフォルト共有は端末内で作るPNGカードになりました。URL公開が未接続でも画像を共有でき、バックエンドへの投稿APIは呼び出しません。

### Profile avatar

Mobile `Profile.avatarUri` is optional. The profile editor stores selected images in the app's document directory in mock mode (data URLs on web), and includes them in the profile share card. Removing the image restores the initial avatar. API mode requires `POST /v1/uploads/profile-avatar` (multipart `file`, response `{ url: "https://…" }`) and avatar persistence in `PUT /v1/me`; the upload endpoint is an integration contract, not an implemented backend upload service. A backend should normalize omitted `avatarUri` to no avatar for this full profile replacement.
