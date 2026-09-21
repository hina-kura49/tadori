import { afterEach, describe, expect, it, vi } from "vitest";
import { api, createRoadmap, createUser } from "./helpers/api";

async function signUp(body: Record<string, unknown>) {
  return api("POST", "/api/auth/sign-up/email", {
    json: { name: "New User", email: "new@example.com", password: "password-1234", ...body },
  });
}

describe("Bearer token", () => {
  it("signin の token を Authorization header に付ければ認証できる", async () => {
    await createUser("alice");
    const signIn = await api("POST", "/api/auth/sign-in/email", {
      json: { email: "alice@example.com", password: "password-1234" },
    });
    const token = signIn.headers.get("set-auth-token");
    expect(token).toBeTruthy();

    const me = await api("GET", "/me", { headers: { authorization: `Bearer ${token}` } });
    expect(me.status).toBe(200);
    expect(me.body.username).toBe("alice");

    const forged = await api("GET", "/me", { headers: { authorization: "Bearer forged-token" } });
    expect(forged.status).toBe(401);
  });
});

describe("Provisional username (Apple / Google で登録した直後の状態)", () => {
  it("username なしで登録すると仮の username が付き、未確定になる", async () => {
    const signedUp = await signUp({});
    expect(signedUp.status).toBe(200);
    const token = signedUp.headers.get("set-auth-token");
    const headers = { authorization: `Bearer ${token}` };

    const me = await api("GET", "/me", { headers });
    expect(me.body.username).toMatch(/^user_[0-9a-f]{10}$/);
    expect(me.body.usernameConfirmed).toBe(false);

    // onboarding で username を決めると確定する
    const updated = await api("PATCH", "/me", { headers, json: { username: "New_Name" } });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ username: "new_name", usernameConfirmed: true });
    expect((await api("GET", "/users/new_name")).status).toBe(200);
  });

  it("username を指定して登録すると最初から確定済み", async () => {
    const alice = await createUser("alice");
    const me = await api("GET", "/me", { as: alice });
    expect(me.body.usernameConfirmed).toBe(true);
  });

  it("他人が使っている username には変更できない", async () => {
    await createUser("alice");
    const bob = await createUser("bob");
    const response = await api("PATCH", "/me", { as: bob, json: { username: "alice" } });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe("USERNAME_TAKEN");
  });
});

describe("DELETE /me", () => {
  it("アカウントと本人のデータが消え、session も無効になる", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const roadmap = await createRoadmap(alice, { stepCount: 1 });
    await api("POST", `/roadmaps/${roadmap.id}/start`, { as: bob });

    expect((await api("DELETE", "/me", { as: alice })).status).toBe(204);

    expect((await api("GET", "/me", { as: alice })).status).toBe(401);
    expect((await api("GET", "/users/alice")).status).toBe(404);
    expect((await api("GET", `/roadmaps/${roadmap.slug}`)).status).toBe(404);
    // 他の User は影響を受けない (alice の Roadmap を進めていた分だけが消える)
    expect((await api("GET", "/me", { as: bob })).status).toBe(200);
    expect((await api("GET", "/me/roadmaps", { as: bob })).body.items).toEqual([]);
  });

  it("未ログインでは呼べない", async () => {
    expect((await api("DELETE", "/me")).status).toBe(401);
  });
});

describe("Login methods", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("GET /api/auth/methods は有効なログイン方式を返す", async () => {
    const response = await api("GET", "/api/auth/methods");
    expect(response.body).toEqual({ emailPassword: true, google: false, apple: false });
  });

  it("メール + パスワードは production では既定で無効。明示すれば有効にできる", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    expect((await import("../src/lib/env")).env.AUTH_EMAIL_PASSWORD_ENABLED).toBe(false);

    vi.stubEnv("AUTH_EMAIL_PASSWORD_ENABLED", "true");
    vi.resetModules();
    expect((await import("../src/lib/env")).env.AUTH_EMAIL_PASSWORD_ENABLED).toBe(true);
  });

  it("Google の client ID はカンマ区切りで複数指定できる", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "web-id, ios-id");
    vi.resetModules();
    expect((await import("../src/lib/env")).env.GOOGLE_CLIENT_ID).toEqual(["web-id", "ios-id"]);
  });
});
