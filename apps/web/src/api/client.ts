import { createApiClient } from "@tadori/api/client";

// API の置き場所。開発中・本番ともに同じオリジンの /_api を経由する (src/routes/api-proxy.ts 参照)。
export const API_BASE = import.meta.env.VITE_API_URL ?? "/_api";

// Hono RPC クライアント。apps/api の route の型がそのまま付く。
// credentials: "include" でログイン Cookie を毎回送る。
export const api = createApiClient(API_BASE, {
  init: { credentials: "include" },
});

/** API が返すエラー。body は apps/api の ErrorResponseBody ({ code, message }) */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * RPC の Response を JSON に変換する。失敗なら ApiError を投げる。
 *   const me = await unwrap(api.me.index.$get());
 */
export async function unwrap<T>(
  pending: Promise<{ ok: boolean; status: number; json(): Promise<T> }>,
): Promise<Exclude<T, { code: string; message: string }>> {
  const res = await pending;
  // 204 No Content は本文が無い (削除系)
  if (res.status === 204) return undefined as Exclude<T, { code: string; message: string }>;
  if (res.ok) return (await res.json()) as Exclude<T, { code: string; message: string }>;
  const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
  throw new ApiError(res.status, body.code ?? "UNKNOWN", body.message ?? "通信に失敗しました");
}

/** RPC の対象外 (Better Auth の /api/auth/*) を呼ぶための fetch */
export async function authFetch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/auth${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { code?: string; message?: string };
  if (!res.ok) throw new ApiError(res.status, data.code ?? "UNKNOWN", data.message ?? "通信に失敗しました");
  return data;
}
