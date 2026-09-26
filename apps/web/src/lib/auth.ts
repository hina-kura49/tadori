import { authFetch } from "@/api/client";

// ログイン・新規登録・ログアウト。認証は apps/api の Better Auth (/api/auth/*)。
// Web ではセッションを Cookie で持つので、token を JS 側で保存しない。

export interface LoginMethods {
  emailPassword: boolean;
  google: boolean;
  apple: boolean;
}
export const getLoginMethods = () => authFetch<LoginMethods>("/methods");

export const signIn = (email: string, password: string) =>
  authFetch("/sign-in/email", { email, password });

/** username は送らない。仮の username が付き、続く onboarding で本人が決める */
export const signUp = (name: string, email: string, password: string) =>
  authFetch("/sign-up/email", { name, email, password });

export const signOut = () => authFetch("/sign-out", {});
