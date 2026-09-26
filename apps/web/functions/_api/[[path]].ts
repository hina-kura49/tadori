// Cloudflare Pages Functions: /_api/* を Render の API へ中継する。
//
// ブラウザからは Web と同じオリジンに見えるので、ログイン Cookie が
// サードパーティ Cookie 扱いにならず、SameSite=None などの設定も要らない。
// 開発中は vite.config.ts の proxy が同じ役割をする。
//
// Cloudflare の管理画面で設定する環境変数:
//   API_ORIGIN           中継先 (例: https://tadori.onrender.com)
//   PROXY_SHARED_SECRET  API と共有する合言葉 (任意)。API はこれが一致したときだけ
//                        x-client-ip を利用者の IP として信じる (docs/web/backend-tasks.md 課題3)

interface Env {
  API_ORIGIN: string;
  PROXY_SHARED_SECRET?: string;
}

interface Context {
  request: Request;
  env: Env;
}

export async function onRequest({ request, env }: Context): Promise<Response> {
  const url = new URL(request.url);
  const target = new URL(url.pathname.replace(/^\/_api/, "") + url.search, env.API_ORIGIN);

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  // 利用者が自分で付けた値は捨て、Cloudflare が調べた本当の IP だけを送る
  headers.delete("x-client-ip");
  headers.delete("x-proxy-secret");
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp && env.PROXY_SHARED_SECRET) {
    headers.set("x-client-ip", clientIp);
    headers.set("x-proxy-secret", env.PROXY_SHARED_SECRET);
  }

  return fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    // リダイレクトは API の応答をそのままブラウザへ返す
    redirect: "manual",
  });
}
