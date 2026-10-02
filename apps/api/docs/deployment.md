# APIの本番公開

この手順で公開するのはHono API。DBは接続済みのSupabaseをそのまま利用する。
無料枠の指定により、Render Freeを使う。[render.yaml](../../../render.yaml)で `plan: free` を明示している。
2026-09-22に既存のRender Freeサービスへ公開済み。API URLは https://tadori.onrender.com 。
Supabase接続と公開ロードマップ10ステップの取得、認証方式の取得、未認証リクエストの401を確認済み。
iPhoneには公開APIを使うRelease版を上書きインストール・起動済み。本人による携帯回線でのログイン・進捗保存は確認待ち。

## コンテナ

リポジトリルートから実行:

```sh
docker build -f apps/api/Dockerfile -t tadori-api .
```

ビルドコンテキストはリポジトリルート。pnpmワークスペースのロックファイル（ルートの `pnpm-lock.yaml`）から `@tadori/api` の依存関係だけを入れる。
Node.js 24とロックファイルに固定した依存関係を使い、型チェックしてから起動する。
APIのTypeScript実行にtsxが必要なため、現在はdevDependenciesもインストールする。
コンテナは非rootのnodeユーザーで実行する。
ルートの `.dockerignore` の許可リストで `.env`、テストデータ、端末データをビルド対象から除外する。
Supabaseの公開CA証明書を同梱し、`sslrootcert=./certs/supabase-ca-2021.crt` は作業ディレクトリ `/repo/apps/api` から解決する。

## ホスティング設定

- Root Directory: 空欄（リポジトリルート）
- Docker Build Context: `.`
- Dockerfile Path: `./apps/api/Dockerfile`
- 2026-09-26にpnpmワークスペースへ移行した。既存サービスの設定（Root Directory `apps/api`）は管理画面で上の値へ変更してから次のデプロイを行う
- Health check: `/health`（プロセスの稼働確認。DB接続は別途確認する）
- ポート: 環境変数 `PORT`、未指定なら4000
- インスタンス: Freeを1台。15分アクセスがないと休止し、復帰に時間がかかる。会合通知のスケジューラは休止中動かない。端末のローカル通知とは別
- 自動seed・DB初期化は実行しない。既存のSupabaseデータを使う

Renderでリポジトリルートの `render.yaml` をBlueprintとして利用できる。自動デプロイはOFF。
Renderの `RENDER_EXTERNAL_URL` を認証の公開URLとして自動利用する。独自ドメインを使う場合は `BETTER_AUTH_URL` で上書きする。
既存のSupabase以外にDB・有料worker・有料cron・有料ディスクを作らない。無料枠の利用上限や休止による制約があるため、常時応答・時刻どおりのサーバー通知は保証できない。

## Renderへの接続

デプロイ操作用に `apps/api/.env.deploy` の `RENDER_API_KEY` を入力する。
APIキーはRenderのAccount Settings → API Keysで発行する。このファイルはGit管理対象外で、Dockerイメージにも含まれない。APIキーをHonoサーバーへ配布しない。
既存サービス `srv-dap0jkf40ujc73b4pvv0` をDockerランタイムへ設定済み。リージョンはVirginia、自動デプロイはOFF。有料プランへの変更は行わない。

## サーバーの環境変数

値はホスティングサービスの環境変数管理へ登録し、リポジトリには保存しない。

| 変数 | 設定 |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | 接続済みSupabaseのSession pooler。TLS検証とCAのパスを含む |
| `BETTER_AUTH_SECRET` | 本番専用に生成する十分長いランダム値 |
| `BETTER_AUTH_URL` | 任意。Renderでは自動設定された `RENDER_EXTERNAL_URL` を使用。独自ドメインなら指定 |
| `AUTH_EMAIL_PASSWORD_ENABLED` | 現在のログイン画面と登録済みアカウントを利用する間は `true` |
| `APP_SCHEME` | `readtree`（2026-10 に `tadori` から変更。Render の値も合わせる） |
| `CORS_ORIGIN` | Web版を使う場合に、その公開originだけをカンマ区切りで指定。nativeだけなら空 |
| `LOG_LEVEL` | `info` |

`DATABASE_MIGRATION_URL` はDB変更を実行する環境にのみ必要。新規マイグレーションを入れないデプロイでは不要。
本番の認証secretを変えると既存セッションに再ログインが必要になる可能性があるが、ユーザー・パスワード・ロードマップのデータは維持される。

メール認証を継続する場合、App Store提出前にパスワード再設定などを整える。Google/Appleログインへの変更は別途実装・設定が必要。

## 公開後の確認

1. `/health` が200とJSON `{"status":"ok"}` を返す。
2. `/api/auth/methods` で現在のログイン方式が有効なことを確認する。
3. `/roadmaps/web-to-distributed-systems` で公開ロードマップと10ステップを取得できる。
4. 未ログインで `/me/dashboard` にアクセスすると401になる。
5. モバイルの `EXPO_PUBLIC_API_URL` を公開HTTPS URL、`EXPO_PUBLIC_API_TIMEOUT_MS=90000` にして再ビルド・上書きインストールする。タイムアウトを延長して休止からの起動を待つ（最大120000ms、通常の既定値12000ms）。更新リクエストを自動再送する設定ではない。
6. iPhoneのWi-FiをOFFにして、本人のアカウントでログイン・閲覧・進捗保存を確認する。

公開済みURLへの切り替えと実機確認が終わるまでは、手元のAPIサーバーを停止しない。

### iPhone向け再ビルド

公開APIの設定はビルド時に渡す。ローカルのMock APIを使うテストに影響しないよう、共通の `.env` には書かない。
`apps/mobile` で実行する（実機IDと署名チームは利用環境に合わせる）。

```sh
EXPO_PUBLIC_API_URL=https://tadori.onrender.com EXPO_PUBLIC_API_TIMEOUT_MS=90000 \
xcodebuild -workspace ios/Tadori.xcworkspace -scheme Tadori -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/tadori-device-build \
  DEVELOPMENT_TEAM=7ZWKBZ43KR IPHONEOS_DEPLOYMENT_TARGET=16.0 \
  -allowProvisioningUpdates build
```

今回のXcode環境では依存するExpoRouterのビルドにiOS 16以上の指定が必要。
App Store提出には別途アーカイブ・配布署名と審査準備が必要。

参考: [Renderの無料枠](https://render.com/docs/free)、[Blueprintの設定](https://render.com/docs/blueprint-spec)、[Render API](https://render.com/docs/api)
