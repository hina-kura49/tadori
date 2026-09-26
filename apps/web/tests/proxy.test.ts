import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "../api/proxy";

const env = { API_ORIGIN: "https://api.example.com", PROXY_SHARED_SECRET: "secret" };

function capture() {
  const fetchMock = vi.fn(async (_url: URL, _init?: RequestInit) =>
    new Response("{}", { status: 200, headers: { "set-cookie": "a=1", "content-encoding": "gzip" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return () => {
    const [url, init] = fetchMock.mock.calls[0]!;
    return { url: url.toString(), init: init!, headers: new Headers(init!.headers) };
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("proxy", () => {
  it("/_api より後ろのパスとクエリを API へ渡す", async () => {
    const sent = capture();
    await proxy(new Request("https://tadori.vercel.app/api/proxy?__path=roadmaps/abc&category=DESIGN"), env);
    expect(sent().url).toBe("https://api.example.com/roadmaps/abc?category=DESIGN");
  });

  it("利用者が偽った x-client-ip は捨て、Vercel が調べた IP と合言葉を付ける", async () => {
    const sent = capture();
    await proxy(
      new Request("https://tadori.vercel.app/api/proxy?__path=api/auth/sign-in/email", {
        method: "POST",
        headers: { "x-client-ip": "1.1.1.1", "x-proxy-secret": "guess", "x-real-ip": "203.0.113.5", origin: "https://tadori.vercel.app" },
        body: "{}",
      }),
      env,
    );
    const { headers, init } = sent();
    expect(init.method).toBe("POST");
    expect(headers.get("x-client-ip")).toBe("203.0.113.5");
    expect(headers.get("x-proxy-secret")).toBe("secret");
    expect(headers.get("origin")).toBe("https://tadori.vercel.app");
    expect(init.redirect).toBe("manual");
  });

  it("合言葉が未設定なら IP を送らない", async () => {
    const sent = capture();
    await proxy(
      new Request("https://tadori.vercel.app/api/proxy?__path=me", { headers: { "x-real-ip": "203.0.113.5", "x-client-ip": "1.1.1.1" } }),
      { API_ORIGIN: env.API_ORIGIN },
    );
    expect(sent().headers.get("x-client-ip")).toBeNull();
  });

  it("Set-Cookie は残し、展開済みの本文と食い違う圧縮の見出しは外す", async () => {
    capture();
    const res = await proxy(new Request("https://tadori.vercel.app/api/proxy?__path=me"), env);
    expect(res.headers.get("set-cookie")).toBe("a=1");
    expect(res.headers.get("content-encoding")).toBeNull();
  });
});
