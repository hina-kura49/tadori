# Web版の公開（Vercel）

Web版（`apps/web`）は React Router のフレームワークモードで作っていて、Vercel で配信する。
SSR（サーバーで HTML を作る方式）を有効にしているのは、共有リンク `/r/:slug` の HTML にロードマップの中身と OGP タグ（SNS やチャットのリンクプレビュー用のタグ）を入れるため。ほかの画面は、ブラウザでデータを取る。
API は今までどおり Render（https://tadori.onrender.com）を使う。

## 全体の形

```text
ブラウザ ──▶ https://<プロジェクト名>.vercel.app
               ├─ /assets/*    … JS・CSS・画像（静的ファイル）
               ├─ /r/:slug     … サーバーで Render の API からロードマップを取り、中身と OGP 入りの HTML を返す
               ├─ /_api/*      … Render の API へ中継（src/routes/api-proxy.ts → src/lib/proxy.server.ts）
               └─ それ以外     … 画面の骨組みの HTML を返し、データはブラウザで取る
```

サーバー側の処理は、`@vercel/react-router` のプリセット（`react-router.config.ts`）が Vercel Functions にまとめる。

ブラウザからは、API も同じドメインにあるように見える。そのためログイン Cookie が「他サイトの Cookie（サードパーティ Cookie）」扱いにならず、`SameSite=None` などを設定しなくても Cookie でログインを保てる。
中継は React Router のルートなので、開発中（`pnpm web`）も同じコードが動く。開発中は `API_ORIGIN` を省略すると `http://localhost:4000` に繋ぐ。

`/r/:slug` のサーバー側の取得は5秒で打ち切る（`src/lib/roadmap/share.server.ts`）。Render が休止明けで間に合わないときは、画面の骨組みだけを返してブラウザで取り直す。そのときのリンクプレビューはタイトルが「Readtree」だけになる。

## 初回の設定

1. Vercel のダッシュボード → Add New → Project で、GitHub の `h-kurashina/tadori` を選ぶ。
2. **Root Directory を `apps/web` にする。** それ以外のビルド設定は `apps/web/vercel.json` に書いてあるので、画面で変える必要はない。
   - Vercel はリポジトリのルートにある `pnpm-lock.yaml` を見て、pnpm を使う。
   - `--filter @tadori/web...` は「Web版と、Web版が使うパッケージ（`@tadori/api` の型）だけを入れる」という指定。Expo などの重い依存を入れずに済む。
   - Root Directory の外にあるファイル（`apps/api` の型）も読む必要がある。そのため、プロジェクト設定の「Include files outside the root directory」は有効のままにする（既定で有効）。
3. 環境変数（Settings → Environment Variables）:

   | 名前 | 値 | 用途 |
   |---|---|---|
   | `API_ORIGIN` | `https://tadori.onrender.com` | 中継先と、`/r/:slug` をサーバーで作るときの取得先。**必須**（本番で無いと中継が 500 を返す） |
   | `PROXY_SHARED_SECRET` | Render と同じ値（任意） | API のレート制限（一定時間のアクセス回数の制限）が、利用者の IP を知るための合言葉（[課題3](backend-tasks.md)）。Sensitive として登録する |

4. Render 側の環境変数 `CORS_ORIGIN` に、`https://<プロジェクト名>.vercel.app` を足す（カンマ区切り）。
   Better Auth は、ログインのときに送信元（Origin）が `trustedOrigins` に入っているかを確かめる。`trustedOrigins` は `CORS_ORIGIN` から作られる（`apps/api/src/lib/auth.ts`）。
   詳しくは [バックエンドの課題](backend-tasks.md) の課題1。

## 本番とプレビュー

- `main` に push すると本番（Production）に公開される。
- それ以外のブランチやプルリクエストでは、確認用のプレビュー URL が自動で作られる。
  - プレビューでログインまで試すなら、そのオリジンも `CORS_ORIGIN` に入れる必要がある。
  - URL は毎回変わる。ふだんは、ブランチごとに決まる URL（`<プロジェクト名>-git-<ブランチ名>-<チーム名>.vercel.app`）を入れておくと楽。
- API の変更を含むときは、API（Render）を先に出す。Web が先に出ると、まだ無い API を呼んでしまう。

## 確かめ方

中継の動きは `apps/web/tests/proxy.test.ts` で確かめている（`pnpm --filter @tadori/web test`）。

手元で Vercel の環境そのものを再現したい場合は、`npx vercel dev` を使う（初回にプロジェクトとの紐付けを聞かれる）。
そのときは、`apps/api/.env` の `CORS_ORIGIN` に `http://localhost:3000` を足す。

## まだ確認していないこと

- Vercel 上での実際のビルドと公開（アカウント操作が必要なため、まだ行っていない）。
- Render の無料プランは、15分使われないと休止する。そのあとの最初のリクエストには数十秒かかる。
  - Vercel Functions の実行時間の上限を超えると、中継がエラーになることがある。
  - 起こるようなら、Vercel のプロジェクト設定（Functions → Max Duration）で上限を延ばす。
- OGP の画像は今はアプリのアイコン（`/icon.png`）。ロードマップごとの画像は作っていない。
