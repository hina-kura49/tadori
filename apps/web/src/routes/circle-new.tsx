import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Choice } from "@/components/circle/Choice";
import { Button, ButtonLink, ErrorMessage, Input, Label, Loading, Page } from "@/components/ui";
import { useBookSearch, useCreateCircle, useRoadmapChoices } from "@/hooks/circle/useCircleTargets";

type TargetType = "ROADMAP" | "BOOK";
type Visibility = "PUBLIC" | "INVITE_ONLY";

const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (ローカル日付)

export default function CircleNew() {
  const navigate = useNavigate();
  // /circles/new?bookId=... や ?roadmapId=... から来たら対象を選んだ状態で始める
  const [params] = useSearchParams();
  const [targetType, setTargetType] = useState<TargetType>(params.get("bookId") ? "BOOK" : "ROADMAP");
  const [roadmapId, setRoadmapId] = useState(params.get("roadmapId") ?? "");
  const [bookId, setBookId] = useState(params.get("bookId") ?? "");
  const [bookQuery, setBookQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [startDate, setStartDate] = useState(today());
  const [targetEndDate, setTargetEndDate] = useState("");
  const [maxMembers, setMaxMembers] = useState("8");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roadmaps = useRoadmapChoices();
  const books = useBookSearch(bookQuery);
  const create = useCreateCircle();

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Circleの名前を入力してください";
    if (targetType === "ROADMAP" && !roadmapId) next.target = "ロードマップを選んでください";
    if (targetType === "BOOK" && !bookId) next.target = "本を選んでください";
    const max = Number(maxMembers);
    if (!Number.isInteger(max) || max < 2 || max > 100) next.maxMembers = "2〜100人で入力してください";
    if (startDate && targetEndDate && startDate > targetEndDate) next.targetEndDate = "開始日より後の日付にしてください";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const base = {
      name: name.trim(),
      description: description.trim() || null,
      visibility,
      startDate: startDate || null,
      targetEndDate: targetEndDate || null,
      maxMembers: Number(maxMembers),
    };
    create.mutate(
      targetType === "BOOK" ? { ...base, targetType, bookId } : { ...base, targetType, roadmapId },
      { onSuccess: (circle) => navigate(`/circles/${circle.id}`, { replace: true }) },
    );
  };

  return (
    <Page>
      <Link to="/circles" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} />
        Circles
      </Link>
      <header className="mb-8">
        <Label>A small circle. A shared path.</Label>
        <h1 className="mt-1 font-serif text-3xl md:text-4xl">一緒に、辿ろう。</h1>
        <p className="mt-2 text-sm text-muted">学ぶ対象と、ゆるやかな予定を決めましょう。</p>
      </header>

      <form onSubmit={submit} className="space-y-8" noValidate>
        <Input name="name" label="名前" placeholder="Circleの名前" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} error={errors.name} />

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">ひとこと（任意）</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="どんなペースで、どんな人と読みたいか"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </label>

        <fieldset className="space-y-3">
          <legend className="mb-3 text-xs font-medium text-muted">学ぶ対象</legend>
          <div className="grid grid-cols-2 gap-2">
            <Choice selected={targetType === "ROADMAP"} onClick={() => setTargetType("ROADMAP")}>ロードマップ</Choice>
            <Choice selected={targetType === "BOOK"} onClick={() => setTargetType("BOOK")}>本</Choice>
          </div>

          {targetType === "ROADMAP" ? (
            roadmaps.isPending ? <Loading /> : roadmaps.error ? (
              <ErrorMessage error={roadmaps.error} onRetry={() => roadmaps.refetch()} />
            ) : roadmaps.data.length ? (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {roadmaps.data.map((r) => (
                  <Choice key={r.id} selected={roadmapId === r.id} onClick={() => setRoadmapId(r.id)} note={r.note}>{r.title}</Choice>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted">
                選べるロードマップがまだありません。
                <ButtonLink to="/roadmaps/new" variant="ghost" className="ml-1 px-2 py-1">ロードマップをつくる</ButtonLink>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <Input name="bookQuery" type="search" placeholder="本のタイトルや著者で検索" value={bookQuery} onChange={(e) => setBookQuery(e.target.value)} />
              {books.isPending ? <Loading /> : books.error ? (
                <ErrorMessage error={books.error} onRetry={() => books.refetch()} />
              ) : books.data.items.length ? (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {books.data.items.map((b) => (
                    <Choice key={b.id} selected={bookId === b.id} onClick={() => setBookId(b.id)} note={b.author}>{b.title}</Choice>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">見つかりませんでした。別のことばで探してみてください。</p>
              )}
            </div>
          )}
          {errors.target && <p className="text-xs text-error">{errors.target}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-xs font-medium text-muted">公開範囲</legend>
          <div className="grid grid-cols-2 gap-2">
            <Choice selected={visibility === "PUBLIC"} onClick={() => setVisibility("PUBLIC")} note="誰でも見つけて参加できる">公開</Choice>
            <Choice selected={visibility === "INVITE_ONLY"} onClick={() => setVisibility("INVITE_ONLY")} note="招待した人だけ">招待制</Choice>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input name="startDate" type="date" label="開始日" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input name="targetEndDate" type="date" label="目標の終了日（任意）" value={targetEndDate} min={startDate || undefined} onChange={(e) => setTargetEndDate(e.target.value)} error={errors.targetEndDate} />
          <Input name="maxMembers" type="number" inputMode="numeric" min={2} max={100} label="最大人数（2〜100人）" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} error={errors.maxMembers} />
        </div>

        {create.error && <ErrorMessage error={create.error} />}
        <Button type="submit" className="w-full" loading={create.isPending}>Circleをつくる</Button>
      </form>
    </Page>
  );
}
