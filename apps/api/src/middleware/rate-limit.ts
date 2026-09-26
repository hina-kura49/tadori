import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { env } from "../lib/env";
import { tooManyRequests } from "../lib/errors";

// 固定ウィンドウ方式のレート制限 (一定時間あたりの回数制限)。
//
// カウンターはこのプロセスのメモリに持つ。Render の無料プランは 1 台なのでこれで足りるが、
// 台数を増やすと台ごとに別々に数えてしまう (そのときは Redis などの共有ストアへ移す)。
// 再起動するとカウンターは 0 に戻る。

type RateLimitOptions = {
  /** 数える時間の長さ (ミリ秒) */
  windowMs: number;
  /** windowMs の間に許す回数 */
  limit: number;
  /** 誰の回数として数えるか。既定はクライアントの IP */
  keyGenerator?: (c: Context) => string;
};

type Counter = { count: number; resetAt: number };

/** これを超えたら期限切れのカウンターを掃除する (メモリが増え続けないように) */
const MAX_COUNTERS = 10_000;

/**
 * レート制限に使うクライアントの IP。
 * - Web 版の中継経由: 中継が付ける x-client-ip を使う。ただし合言葉 (x-proxy-secret) が
 *   一致したときだけ。そうしないと誰でも x-client-ip を偽って制限をすり抜けられる
 * - それ以外: x-forwarded-for の末尾。Render の中継サーバーが最後に付け足す値で、
 *   利用者が自分で書き換えられるのは先頭側だけ
 */
export function clientIp(c: Context): string {
  const secret = env.PROXY_SHARED_SECRET;
  if (secret && c.req.header("x-proxy-secret") === secret) {
    const proxied = c.req.header("x-client-ip");
    if (proxied) return proxied;
  }
  const forwarded = c.req.header("x-forwarded-for")?.split(",");
  return forwarded?.at(-1)?.trim() || "unknown";
}

export function rateLimit({ windowMs, limit, keyGenerator = clientIp }: RateLimitOptions) {
  const counters = new Map<string, Counter>();

  return createMiddleware(async (c, next) => {
    const now = Date.now();
    if (counters.size > MAX_COUNTERS) {
      for (const [key, counter] of counters) {
        if (counter.resetAt <= now) counters.delete(key);
      }
    }

    const key = keyGenerator(c);
    const counter = counters.get(key);
    if (!counter || counter.resetAt <= now) {
      counters.set(key, { count: 1, resetAt: now + windowMs });
    } else if (counter.count < limit) {
      counter.count++;
    } else {
      // 何秒後にまた試せるか。onError が作るレスポンスにもこの header は残る
      c.header("Retry-After", String(Math.ceil((counter.resetAt - now) / 1000)));
      throw tooManyRequests();
    }
    await next();
  });
}
