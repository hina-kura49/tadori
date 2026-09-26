# 運用：ローカルと main

| | ローカル | 本番（main） |
|---|---|---|
| DB | docker compose の PostgreSQL（`localhost:55432`） | Supabase |
| API | `pnpm dev:api` → http://localhost:4000 | Render（https://tadori.onrender.com） |
| Web | `pnpm web` → http://localhost:5173 | Vercel |
| mobile | `EXPO_PUBLIC_API_URL=http://<MacのIP>:4000 pnpm start` | リリースビルドに本番 URL を埋め込む |
| 設定ファイル | `apps/api/.env` | Render / Vercel の環境変数（手元の控えは `apps/api/.env.production`） |

`.env` 以外の `.env.*`（`.env.example` を除く）は Git に入らない。

## ローカル

```sh
pnpm install
pnpm dev:api --seed   # 初回だけ --seed。DB 起動 → マイグレーション → API 起動
pnpm web              # 別のターミナルで
```

- `pnpm dev:api` は `docker compose up -d db` を自動で行う。DB だけ止めるときは `pnpm db:down`。データは Docker のボリューム `tadori_local_pg` に残る。
- テストは同じコンテナの `tadori_test` を使う（`pnpm test`）。テストは手元の `.env` を読まない。
- mobile を実機でローカル API に繋ぐときは、Mac の LAN の IP を使う（`localhost` は iPhone 自身を指すため）。詳しくは `apps/mobile/.env.example`。

### DB の構造を変えるとき

```sh
cd apps/api
# src/db/schema/ を編集してから
pnpm db:generate      # drizzle/ に SQL ができる。中身を必ず読む
pnpm db:migrate       # ローカル DB に当てる
```

新しいテーブルには、既存のテーブルと同じく RLS の有効化と、Supabase の `anon` / `authenticated` からの権限取り消しを入れる（例: `drizzle/0002_user_preferences.sql` の末尾）。

## 本番（main）

作業はブランチで行い、プルリクエストで CI（型チェック・テスト・ビルド）が通ってから main に入れる。

### 今の出し方（手動）

1. main に入れる。
2. DB の構造が変わるときは、先に本番 DB へマイグレーションを当てる。
   ```sh
   cd apps/api
   ENV_FILE=.env.production pnpm db:migrate
   ```
   `ENV_FILE=.env.production` を付けたときだけ本番の設定を読む。付け忘れるとローカル DB に当たるだけで、本番には触れない。
3. Render で API をデプロイする（自動デプロイは OFF）。
4. Web は Vercel が main から自動で公開する（[手順](web/deployment.md)）。API より先に Web が出ると、まだ無い API を呼んでしまうので、API の変更を含むときは API を先に出す。

### 未決定：自動化するかどうか

次の2つは本番の動きを変えるため、まだ入れていない。

- **main で CI が通ったら Render に自動デプロイ**：`render.yaml` の `autoDeployTrigger` を `checksPass` にする（管理画面でも同じ設定ができる）。
- **API の起動時に未適用のマイグレーションを自動で当てる**：`apps/api/Dockerfile` の起動コマンドを `migrate.ts` → `index.ts` の順にする。上の手順2が不要になる代わりに、main に入った SQL がそのまま本番 DB に当たる。

### 本番に出す前に一度だけ必要な作業

- Render の設定：Root Directory を空欄、Dockerfile Path を `./apps/api/Dockerfile` に変更する（pnpm ワークスペースへの移行のため。[詳細](../apps/api/docs/deployment.md)）。
- 本番 DB へ `0002_user_preferences` を当てる（上の手順2）。
- `openssl rand -hex 32` で合言葉を作り、Render と Vercel の両方に `PROXY_SHARED_SECRET` として登録する。
- Render の `CORS_ORIGIN` に Vercel の URL を足す。
