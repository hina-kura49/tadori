import { describe, expect, it } from "vitest";
import { api, createUser } from "./helpers/api";

describe("Auth", () => {
  it("signup -> GET /me で current user を返す", async () => {
    const alice = await createUser("alice");
    const me = await api("GET", "/me", { as: alice });

    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ id: alice.id, username: "alice", email: "alice@example.com" });
  });

  it("signin / session / signout が動く", async () => {
    await createUser("alice");
    const signIn = await api("POST", "/api/auth/sign-in/email", {
      json: { email: "alice@example.com", password: "password-1234" },
    });
    expect(signIn.status).toBe(200);
    const cookie = signIn.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");

    const session = await api("GET", "/api/auth/get-session", { headers: { cookie } });
    expect(session.body.user.username).toBe("alice");

    const signOut = await api("POST", "/api/auth/sign-out", {
      headers: { cookie, origin: "http://localhost:8081" },
      json: {},
    });
    expect(signOut.status).toBe(200);

    const me = await api("GET", "/me", { headers: { cookie } });
    expect(me.status).toBe(401);
  });

  it("username が重複していると signup できない", async () => {
    await createUser("alice");
    const response = await api("POST", "/api/auth/sign-up/email", {
      json: { name: "x", email: "other@example.com", password: "password-1234", username: "alice" },
    });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe("USERNAME_TAKEN");
  });

  it("username の形式が不正だと signup できない", async () => {
    const response = await api("POST", "/api/auth/sign-up/email", {
      json: { name: "x", email: "x@example.com", password: "password-1234", username: "a b!" },
    });
    expect(response.status).toBe(400);
  });
});

describe("requireAuth middleware", () => {
  it("未ログインは統一形式の 401 を返す", async () => {
    const response = await api("GET", "/me");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: "UNAUTHORIZED", message: "Authentication required" });
  });

  it("不正な cookie は 401", async () => {
    const response = await api("GET", "/me", {
      headers: { cookie: "better-auth.session_token=forged.value" },
    });
    expect(response.status).toBe(401);
  });

  it("認証が必要な書き込み系 route も 401", async () => {
    const response = await api("POST", "/roadmaps", {
      json: { title: "x", category: "OTHER", difficulty: "BEGINNER" },
    });
    expect(response.status).toBe(401);
  });
});

describe("Error format", () => {
  it("Zod のエラーは VALIDATION_ERROR に変換される", async () => {
    const alice = await createUser("alice");
    const response = await api("POST", "/roadmaps", { as: alice, json: { title: "" } });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.body.details.length).toBeGreaterThan(0);
  });

  it("存在しない route は NOT_FOUND", async () => {
    const response = await api("GET", "/nope");
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });
});
