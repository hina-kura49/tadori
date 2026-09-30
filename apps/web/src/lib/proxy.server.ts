// /_api/* を API (Render) へ中継する。src/routes/api-proxy.ts から呼ばれる。
//
// ブラウザからは Web と同じオリジンに見えるので、ログイン Cookie が
// サードパーティ Cookie 扱いにならず、SameSite=None などの設定も要らない。
// 開発中 (react-router dev) も本番 (Vercel) も、このコードが動く。
//
// 環境変数 (本番は Vercel の管理画面で設定する):
//   API_ORIGIN           中継先 (例: https://tadori.onrender.com)。開発中は省略すると http://localhost:4000
//   PROXY_SHARED_SECRET  API と共有する合言葉 (任意)。API はこれが一致したときだけ
//                        x-client-ip を利用者の IP として信じる (docs/web/backend-tasks.md 課題3)

import { apiOrigin } from "./api-origin.server";

/** path は /_api より後ろの部分 (例: "me/dashboard") */
export async function proxy(request: Request, path: string, env = process.env): Promise<Response> {
  const origin = apiOrigin(env);
  if (!origin) return Response.json({ code: "INTERNAL_ERROR", message: "API_ORIGIN is not set" }, { status: 500 });

  const url = new URL(request.url);
  const target = new URL(`/${path.replace(/^\/+/, "")}${url.search}`, origin);

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  // 利用者が自分で付けた値は捨て、Vercel が調べた本当の IP だけを送る
  headers.delete("x-client-ip");
  headers.delete("x-proxy-secret");
  const clientIp = request.headers.get("x-real-ip");
  if (clientIp && env.PROXY_SHARED_SECRET) {
    headers.set("x-client-ip", clientIp);
    headers.set("x-proxy-secret", env.PROXY_SHARED_SECRET);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const res = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // Node.js の fetch で body をストリームのまま送るのに必要
    ...(hasBody ? { duplex: "half" } : {}),
    // リダイレクトは API の応答をそのままブラウザへ返す
    redirect: "manual",
  } as RequestInit);

  // fetch が展開済みの本文に、圧縮済みの長さ・形式の見出しが残ると壊れるので外す
  const out = new Headers(res.headers);
  out.delete("content-encoding");
  out.delete("content-length");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}
