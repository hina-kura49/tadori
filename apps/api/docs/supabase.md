# Supabase接続

接続対象: [TadoriのSupabaseプロジェクト](https://supabase.com/dashboard/project/vgjvkusnyyeucdyycptt)

構成は Expo → Hono API / Better Auth → Drizzle → Supabase PostgreSQL。
認証は既存のBetter Authを利用し、Supabase Authへの移行は行わない。
SupabaseのプロジェクトURLやpublishable keyではなく、PostgreSQLの接続文字列をAPIサーバーへ設定する。

## 入力する環境変数

`apps/api/.env` に接続情報を設定する。このファイルはGit管理対象外。

```dotenv
DATABASE_URL=
DATABASE_MIGRATION_URL=
```

- `DATABASE_URL`: Dashboardの **Connect → Session pooler** に表示される接続文字列（5432）。現在の常駐Node.js APIとIPv4接続に使う。
- `DATABASE_MIGRATION_URL`: マイグレーション用の **Direct connection**（IPv6が必要な場合あり）。IPv4のみならSession poolerを使える。`DATABASE_URL`がSession poolerなら空欄でもよく、その値を再利用する。Transaction pooler（6543）はここに指定しない。

パスワードは予約文字をURLエンコードする。接続文字列には `sslmode=verify-full` を指定する。独自CAが必要な場合はDashboardからCA証明書を取得し、URLパラメータ `sslrootcert` に証明書ファイルのパスを指定する。TLSの証明書検証を無効化しない。

接続文字列・DBパスワードを `EXPO_PUBLIC_*` やチャットへ貼り付けない。モバイルはHonoの `EXPO_PUBLIC_API_URL` を使う。SupabaseのAPIキーはこの構成では不要。

## 初回接続

1. 新規環境では、対象プロジェクトの **Data API integration → Enable Data API** をOFFにするか、テーブル作成前にData API用ロールへのデフォルト権限を取り消す。既存の認可はHono内にあるため、直接REST経由で公開しない。このプロジェクトで実施した設定は末尾を参照。
2. `.env` の接続文字列を入力する。実行環境へ既に環境変数を設定している場合は、その値が `.env` より優先される。
3. `apps/api` で以下を実行する。

```sh
npm run db:migrate
npm run db:check
```

`db:migrate` は既存のDrizzleマイグレーションを適用する。初回はTadoriのテーブルと制約を作成する。既存データや同名テーブルがあるプロジェクトでは、適用前に内容を確認する。

`db:check` は通常接続先へ読み取り専用で接続し、スキーマ定義にある15テーブルの存在を確認する。カラム・制約・認証・Data APIの無効化まで検証するコマンドではない。不足テーブルや接続失敗があれば終了コード1になる。

本番DBで `db:seed` やテストを実行しない。seedは開発用アカウントを作る。APIテストには別のローカルテストDBを使う。

## APIの公開とロードマップ登録

DB接続だけではアプリの本番APIは公開されない。Hono APIの配置先で次を設定する。

- `NODE_ENV=production`
- `DATABASE_URL`、必要なら `DATABASE_MIGRATION_URL`
- 本番専用の `BETTER_AUTH_SECRET`
- APIのHTTPS URLを `BETTER_AUTH_URL` に設定
- Google / Appleログインの設定（`.env.example`参照）
- Webを公開する場合、そのoriginを `CORS_ORIGIN` に設定

モバイルの `EXPO_PUBLIC_API_URL` をHono APIのHTTPS URLに設定してビルドする。
本人がログインしてアカウントを作成した後、[準備済みロードマップ](../../../docs/roadmaps/web-to-distributed-systems.md)をそのアカウントで公開登録する。

## 公式資料

- [PostgreSQLへの接続方式](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Data APIの無効化・アクセス制御](https://supabase.com/docs/guides/api/securing-your-api)

## 接続済み環境の状態（2026-09-22）

- 指定プロジェクトへSession poolerで接続済み。TLSのCA・ホスト名検証成功。
- 既存のDrizzleマイグレーション2件を適用。15テーブルを作成し、`db:check`で確認済み。
- 15テーブルすべてRLS有効。許可ポリシーは作らず、`anon` / `authenticated` / `PUBLIC` のテーブル権限は0件。
- Data API自体のON/OFFは変更・確認していない。下記DB権限とRLSで保護している。
- 接続はサーバー側の `postgres` ロールを使用。認可は引き続きHonoで実施する。
- 本番APIのデプロイとソーシャルログイン設定は未実行。Mac上のHono APIからSupabaseに接続し、本人が開発用メール認証でアカウントを作成済み。
- 「蔵品日向」を作成者として `web-to-distributed-systems` を公開登録済み。10冊・10ステップの取得を公開APIで確認。

初回テーブル作成前に、専用の空のプロジェクトへ以下を適用した。

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;
```

作成後は各アプリテーブルへ `ENABLE ROW LEVEL SECURITY` と、同じ3ロールに対する `REVOKE ALL ON TABLE` を適用した。今後追加するテーブルもRLSを有効にする。別のロールでテーブルを作成する場合は、そのロールのデフォルト権限も確認する。

公開CA証明書は `certs/supabase-ca-2021.crt` に保存。接続URLの `sslrootcert=./certs/supabase-ca-2021.crt` は `apps/api` を作業ディレクトリとして解決する。デプロイ時もこのファイルを含め、実際の配置先に合わせてパスを指定する。
