import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleError } from "../src/middleware/error-handler";
import { clientIp, rateLimit } from "../src/middleware/rate-limit";

// app.ts ではテスト中にレート制限を外しているので、小さな Hono app に付けて確かめる

function createTestApp(limit: number) {
  const app = new Hono();
  app.onError(handleError);
  app.use(rateLimit({ windowMs: 60_000, limit }));
  app.post("/sign-in", (c) => c.json({ ok: true }, 200));
  app.get("/ip", (c) => c.text(clientIp(c)));
  return app;
}

const signIn = (app: Hono, ip: string) =>
  app.request("/sign-in", { method: "POST", headers: { "x-forwarded-for": ip } });

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit middleware", () => {
  it("上限を超えると統一形式の 429 と Retry-After を返す", async () => {
    const app = createTestApp(2);
    expect((await signIn(app, "203.0.113.1")).status).toBe(200);
    expect((await signIn(app, "203.0.113.1")).status).toBe(200);

    const blocked = await signIn(app, "203.0.113.1");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("60");
    expect(await blocked.json()).toEqual({
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
    });
  });

  it("IP ごとに別々に数える", async () => {
    const app = createTestApp(1);
    expect((await signIn(app, "203.0.113.1")).status).toBe(200);
    expect((await signIn(app, "203.0.113.1")).status).toBe(429);
    expect((await signIn(app, "203.0.113.2")).status).toBe(200);
  });

  it("windowMs が過ぎると元に戻る", async () => {
    vi.useFakeTimers();
    const app = createTestApp(1);
    expect((await signIn(app, "203.0.113.1")).status).toBe(200);
    expect((await signIn(app, "203.0.113.1")).status).toBe(429);

    vi.advanceTimersByTime(60_000);
    expect((await signIn(app, "203.0.113.1")).status).toBe(200);
  });
});

describe("clientIp", () => {
  const ipOf = async (headers: Record<string, string>) => {
    const response = await createTestApp(100).request("/ip", { headers });
    return response.text();
  };

  it("x-forwarded-for の末尾 (Render が付け足した値) を使う", async () => {
    expect(await ipOf({ "x-forwarded-for": "198.51.100.9, 203.0.113.1" })).toBe("203.0.113.1");
    expect(await ipOf({})).toBe("unknown");
  });

  it("x-client-ip は合言葉が一致したときだけ信じる", async () => {
    const headers = { "x-forwarded-for": "203.0.113.1", "x-client-ip": "198.51.100.9" };
    expect(await ipOf(headers)).toBe("203.0.113.1");
    expect(await ipOf({ ...headers, "x-proxy-secret": "wrong" })).toBe("203.0.113.1");
    expect(await ipOf({ ...headers, "x-proxy-secret": "test-proxy-secret" })).toBe("198.51.100.9");
  });
});
