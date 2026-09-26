# Web版の公開（Cloudflare Pages）

Web版（`apps/web`）はビルドすると HTML・JS・CSS だけになる静的サイトなので、Cloudflare Pages の無料プランで配信する。
API は今までどおり Render（https://tadori.onrender.com）を使う。

## 全体の形

```text
ブラウザ ──▶ https://<プロジェクト名>.pages.dev
               ├─ /            … apps/web/dist の静的ファイル（React アプリ）
               └─ /_api/*      … Pages Functions が Render の API へ中継
                                  (apps/web/functions/_api/[[path]].ts)
```

ブラウザからは API も同じドメインに見える。そのためログイン Cookie が「他サイトの Cookie（サードパーティ Cookie）」扱いにならず、
`SameSite=None` などの設定をしなくても Cookie でログインを保てる。開発中は `vite.config.ts` の `proxy` が同じ役割をする。

## 初回の設定

1. Cloudflare のダッシュボード → Workers & Pages → 作成 → Pages → Git に接続 で、GitHub の `h-kurashina/tadori` を選ぶ。
2. ビルドの設定:

   | 項目 | 値 |
   |---|---|
   | 本番ブランチ | `main` |
   | フレームワーク | なし |
   | ルートディレクトリ | `apps/web` |
   | ビルドコマンド | `npx pnpm@10.30.2 install --frozen-lockfile --filter @tadori/web... && npx pnpm@10.30.2 build` |
   | 出力ディレクトリ | `dist` |

   - ルートディレクトリを `apps/web` にするのは、`functions/` フォルダをルートディレクトリ直下に置く決まりがあるため。
   - `--filter @tadori/web...` は「Web版と、Web版が使うパッケージ（`@tadori/api` の型）」だけを入れる指定。Expo などの重い依存を入れずに済む。

3. 環境変数（設定 → 変数とシークレット）:

   | 名前 | 値 | 用途 |
   |---|---|---|
   | `API_ORIGIN` | `https://tadori.onrender.com` | 中継先（Functions が使う） |
   | `NODE_VERSION` | `24` | ビルドに使う Node.js |
   | `SKIP_DEPENDENCY_INSTALL` | `1` | Cloudflare の自動インストール（npm）を止め、ビルドコマンドの pnpm に任せる |
   | `PROXY_SHARED_SECRET` | Render と同じ値（任意） | API のレート制限が利用者の IP を知るための合言葉（[課題3](backend-tasks.md)）。シークレットとして登録する |

4. Render 側の環境変数 `CORS_ORIGIN` に `https://<プロジェクト名>.pages.dev` を足す（カンマ区切り）。
   Better Auth はログイン時に送信元（Origin）が `trustedOrigins` に入っているかを確認し、`trustedOrigins` は `CORS_ORIGIN` から作られるため（`apps/api/src/lib/auth.ts`）。
   詳しくは [バックエンドの課題](backend-tasks.md) の課題1。

## SPA（1枚の HTML で画面を切り替える方式）の扱い

Cloudflare Pages は、トップレベルに `404.html` が無いと SPA とみなし、知らない URL（例: `/roadmaps/xxx`）にも `index.html` を返す。
そのため `_redirects` は置いていない。`404.html` を追加するとこの動きが変わるので注意。

## プレビュー

`main` 以外のブランチに push すると、`<ハッシュ>.<プロジェクト名>.pages.dev` の確認用 URL が自動で作られる。
プレビュー URL でログインまで試す場合は、そのオリジンも `CORS_ORIGIN` に入れる必要がある（毎回変わるので、ふだんはブランチ別の固定 URL `<ブランチ名>.<プロジェクト名>.pages.dev` を入れておくと楽）。

## 手元で本番に近い形を試す

```sh
./scripts/local-api.sh                        # ローカル API (localhost:4000)
pnpm --filter @tadori/web build
cd apps/web
npx wrangler pages dev dist --binding API_ORIGIN=http://localhost:4000
# → http://localhost:8788 で、Functions の中継を含めて動く
```

`http://localhost:8788` をローカル API の `CORS_ORIGIN` に入れておく（`scripts/local-api.sh` に設定済み）。

## まだ確認していないこと

- Cloudflare 上での実際のビルドと公開（アカウント操作が必要なため未実施）。
- Render の無料プランは 15 分使われないと休止し、最初のリクエストに数十秒かかる。中継が待つあいだ、画面には「読み込み中」を表示する。
