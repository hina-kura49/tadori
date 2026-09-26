import { Check, Route } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button, Card, Input, Label, Loading } from "@/components/ui";
import { useUpdateMe } from "@/hooks/me/useDashboard";
import { useUpdatePreferences } from "@/hooks/me/usePreferences";
import { useMe } from "@/hooks/useMe";
import { CATEGORIES, type Category, categoryLabel } from "@/lib/roadmap/labels";

// 初回だけ通る画面。ようこそ → 興味のある分野 → 表示名と username → Today へ。
// username は自動採番の仮のもの (user_xxxx) なので、ここで本人に決めてもらう。
// 興味とオンボーディング完了は PATCH /me/preferences、名前は PATCH /me で保存する。

const USERNAME = /^[a-z0-9_]{3,30}$/;

export default function Onboarding() {
  const { data: me, isPending } = useMe();
  const navigate = useNavigate();
  const save = useUpdateMe();
  const savePreferences = useUpdatePreferences();
  const [stage, setStage] = useState<"welcome" | "interests" | "profile">("welcome");
  const [interests, setInterests] = useState<Category[]>([]);
  const [name, setName] = useState<string>();
  const [username, setUsername] = useState("");

  if (isPending) return <Loading />;
  if (!me) return <Navigate to="/login" replace />;
  if (me.usernameConfirmed && !save.isPending) return <Navigate to="/" replace />;

  const usernameError = username && !USERNAME.test(username) ? "半角の英小文字・数字・_ で 3〜30 文字にしてください" : undefined;
  const saveError =
    save.error && "code" in save.error && save.error.code === "USERNAME_TAKEN"
      ? "この username はすでに使われています"
      : (save.error ?? savePreferences.error)?.message;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      // PATCH /me が通ると usernameConfirmed が true になり Today へ移るので、好みを先に保存する
      await savePreferences.mutateAsync({ interests, onboarded: true });
      await save.mutateAsync({ name: (name ?? me.name).trim() || "Learner", username });
      navigate("/", { replace: true });
    } catch {
      // エラーは save.error で表示する
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-10 px-4 py-10">
      <p className="inline-flex items-center gap-2 font-serif text-3xl">
        <Route className="text-accent" size={24} />
        tadori
      </p>
      {stage === "welcome" ? (
        <section className="flex flex-1 flex-col justify-center gap-8 text-center">
          <Route size={64} strokeWidth={1.2} className="mx-auto text-accent" />
          <h1 className="font-serif text-4xl leading-tight">
            Learn by following
            <br />a path.
          </h1>
          <p className="text-sm leading-7 text-muted">
            何を、どの順番で、どこまで学ぶか。
            <br />
            本から、あなたの学びの道をつくる。
          </p>
          <Button onClick={() => setStage("interests")}>Start your path</Button>
        </section>
      ) : stage === "interests" ? (
        <section className="space-y-6">
          <div className="space-y-2">
            <Label>Your interests</Label>
            <h1 className="font-serif text-3xl leading-tight">What do you want to learn?</h1>
            <p className="text-sm text-muted">気になる分野を選んでください。あとから設定で変えられます。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const selected = interests.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setInterests((current) =>
                      selected ? current.filter((c) => c !== category) : [...current, category],
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors ${
                    selected ? "border-accent bg-accent text-white" : "border-line bg-white hover:bg-wash"
                  }`}
                >
                  {selected && <Check size={14} />}
                  {categoryLabel[category]}
                </button>
              );
            })}
          </div>
          <Button className="w-full" onClick={() => setStage("profile")}>
            {interests.length > 0 ? "次へ" : "あとで選ぶ"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setStage("welcome")}>
            戻る
          </Button>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="space-y-2">
            <Label>Your name</Label>
            <h1 className="font-serif text-3xl leading-tight">How should we call you?</h1>
            <p className="text-sm text-muted">プロフィールの URL やサークルの招待で使う名前を決めてください。</p>
          </div>
          <Card>
            <form onSubmit={onSubmit} className="space-y-4">
              <Input label="表示名" name="name" required maxLength={80} value={name ?? me.name} onChange={(e) => setName(e.target.value)} />
              <Input
                label="username"
                name="username"
                required
                autoCapitalize="none"
                autoComplete="username"
                placeholder="tadori_learner"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                error={usernameError}
              />
              {username && !usernameError && <p className="text-xs text-muted">tadori/profile/{username}</p>}
              {saveError && (
                <p className="text-sm text-error" role="alert">
                  {saveError}
                </p>
              )}
              <Button type="submit" className="w-full" loading={save.isPending || savePreferences.isPending} disabled={!USERNAME.test(username)}>
                はじめる
              </Button>
            </form>
          </Card>
          <Button variant="ghost" className="w-full" onClick={() => setStage("interests")}>
            戻る
          </Button>
        </section>
      )}
    </main>
  );
}
