import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Route } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { ApiError } from "@/api/client";
import { Button, Card, ErrorMessage, Input, Loading } from "@/components/ui";
import { meKey, useMe } from "@/hooks/useMe";
import { getLoginMethods, signIn, signUp } from "@/lib/auth";

type Mode = "signin" | "signup";

// Better Auth のエラーコード → 画面に出す文言
const authMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "メールアドレスかパスワードが違います。",
  USER_ALREADY_EXISTS: "このメールアドレスはすでに登録されています。",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "このメールアドレスはすでに登録されています。",
  PASSWORD_TOO_SHORT: "パスワードは 8 文字以上にしてください。",
  INVALID_EMAIL: "メールアドレスの形式が正しくありません。",
};
const authMessage = (error: Error) =>
  (error instanceof ApiError && authMessages[error.code]) || "うまくいきませんでした。時間をおいてもう一度お試しください。";

/** ?next= は同じサイト内のパスだけ受け付ける (外部サイトへの転送を防ぐ) */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/");

export default function Login() {
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const navigate = useNavigate();
  const client = useQueryClient();
  const me = useMe();
  const methods = useQuery({ queryKey: ["auth", "methods"], queryFn: getLoginMethods });
  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const submit = useMutation({
    mutationFn: () =>
      mode === "signin" ? signIn(form.email, form.password) : signUp(form.name, form.email, form.password),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: meKey });
      navigate(mode === "signup" ? "/onboarding" : next, { replace: true });
    },
  });

  if (me.data) return <Navigate to={next} replace />;
  if (me.isPending || methods.isPending) return <Loading />;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit.mutate();
  };
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-4 py-10">
      <div className="space-y-3 text-center">
        <p className="inline-flex items-center gap-2 font-serif text-3xl">
          <Route className="text-accent" size={26} />
          tadori
        </p>
        <p className="text-sm text-muted">本から、あなたの学びの道をつくる。</p>
      </div>

      {methods.error ? (
        <ErrorMessage error={methods.error} onRetry={() => methods.refetch()} />
      ) : !methods.data?.emailPassword ? (
        <Card className="text-center text-sm text-muted">現在、Web 版ではログインできません。</Card>
      ) : (
        <Card className="p-6">
          <div className="mb-6 grid grid-cols-2 rounded-full bg-wash p-1 text-sm" role="tablist">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  submit.reset();
                }}
                className={`rounded-full py-2 font-medium transition-colors ${mode === m ? "bg-white text-ink shadow-sm" : "text-muted"}`}
              >
                {m === "signin" ? "ログイン" : "新規登録"}
              </button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <Input label="表示名" name="name" autoComplete="name" required maxLength={80} value={form.name} onChange={set("name")} />
            )}
            <Input label="メールアドレス" name="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
            <Input
              label="パスワード"
              name="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={form.password}
              onChange={set("password")}
            />
            {submit.error && (
              <p className="text-sm text-error" role="alert">
                {authMessage(submit.error)}
              </p>
            )}
            <Button type="submit" className="w-full" loading={submit.isPending}>
              {mode === "signin" ? "ログイン" : "アカウントを作る"}
            </Button>
          </form>
        </Card>
      )}
    </main>
  );
}
