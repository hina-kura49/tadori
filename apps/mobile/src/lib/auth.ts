import { request } from "@/api/client";
import { remote } from "@/api/remote";
import { getDeviceId, session } from "./storage";

// ログイン・ログアウト・アカウント削除。認証は apps/api の Better Auth (/api/auth/*)。
// token は sign-in の response body に入っており、以降は Authorization: Bearer で送る。

export interface LoginMethods {
  emailPassword: boolean;
  google: boolean;
  apple: boolean;
}
export const getLoginMethods = () =>
  request<LoginMethods>("/api/auth/methods");

async function startSession(path: string, body: Record<string, string>) {
  const result = await request<{ token: string | null }>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.token) throw new Error("ログインに失敗しました。");
  remote.reset();
  await session.setToken(result.token);
}

export const signIn = (email: string, password: string) =>
  startSession("/api/auth/sign-in/email", { email, password });

/** username は送らない。仮の username が付き、続く onboarding で本人が決める */
export const signUp = (name: string, email: string, password: string) =>
  startSession("/api/auth/sign-up/email", { name, email, password });

export async function signOut() {
  // この端末への Push を止めてから session を破棄する。どちらも失敗してもログアウトは完了させる
  await request(`/me/devices/${encodeURIComponent(await getDeviceId())}`, {
    method: "DELETE",
  }).catch(() => {});
  await request("/api/auth/sign-out", { method: "POST", body: "{}" }).catch(
    () => {},
  );
  await session.clearToken();
  remote.reset();
}

/** 元に戻せない。作成した Roadmap・Circle・学習の進捗もサーバーから消える */
export async function deleteAccount() {
  await request("/me", { method: "DELETE" });
  await session.clearToken();
  remote.reset();
}
