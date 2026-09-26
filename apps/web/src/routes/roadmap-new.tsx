import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Button, Card, ErrorMessage, Input, Page } from "@/components/ui";
import { BookCover } from "@/components/BookCover";
import { BookPicker } from "@/components/roadmap/BookPicker";
import { useCreateRoadmap, type RoadmapDraft } from "@/hooks/roadmap/useCreateRoadmap";
import {
  CATEGORIES,
  categoryLabel,
  DIFFICULTIES,
  difficultyLabel,
  VISIBILITIES,
  visibilityLabel,
} from "@/lib/roadmap/labels";

type Step = RoadmapDraft["steps"][number];

// 日数の入力欄は空欄なら null。1〜3650 の整数だけ受け付ける (API と同じ範囲)
const toDays = (value: string) => (value.trim() === "" ? null : Number(value));
const validDays = (value: string) => {
  const days = toDays(value);
  return days === null || (Number.isInteger(days) && days >= 1 && days <= 3650);
};

export default function RoadmapNew() {
  const navigate = useNavigate();
  const create = useCreateRoadmap();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RoadmapDraft["category"]>("ENGINEERING");
  const [difficulty, setDifficulty] = useState<RoadmapDraft["difficulty"]>("BEGINNER");
  const [days, setDays] = useState("");
  const [visibility, setVisibility] = useState<RoadmapDraft["visibility"]>("PUBLIC");
  const [steps, setSteps] = useState<(Omit<Step, "estimatedDays"> & { days: string })[]>([]);
  const [picking, setPicking] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateStep = (index: number, patch: Partial<(typeof steps)[number]>) =>
    setSteps((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const move = (index: number, delta: number) =>
    setSteps((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item!);
      return next;
    });

  const errors = {
    title: !title.trim() ? "タイトルを入力してください" : undefined,
    days: !validDays(days) ? "1〜3650 の整数で入力してください" : undefined,
    steps: steps.length === 0 ? "本を 1 冊以上追加してください" : undefined,
  };
  const stepErrors = steps.map((s) => ({
    checkpoint: !s.checkpoint.trim() ? "到達点を入力してください" : undefined,
    days: !validDays(s.days) ? "1〜3650 の整数で入力してください" : undefined,
  }));
  const hasError = Object.values(errors).some(Boolean) || stepErrors.some((e) => e.checkpoint || e.days);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (hasError) return;
    const roadmap = await create.mutateAsync({
      title: title.trim(),
      description,
      category,
      difficulty,
      estimatedDays: toDays(days),
      visibility,
      steps: steps.map(({ days, ...s }) => ({ ...s, checkpoint: s.checkpoint.trim(), estimatedDays: toDays(days) })),
    });
    navigate(`/roadmaps/${roadmap.slug}`, { replace: true });
  }

  const show = (message?: string) => (submitted ? message : undefined);

  return (
    <Page eyebrow="Create a roadmap" title="つながる学びを、つくる。">
      <form onSubmit={(e) => onSubmit(e).catch(() => {})} className="space-y-8" noValidate>
        <Card className="space-y-5">
          <Input
            label="タイトル *"
            name="title"
            maxLength={120}
            placeholder="例：TypeScriptから分散システムへ"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={show(errors.title)}
          />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">説明</span>
            <textarea
              name="description"
              rows={3}
              maxLength={2000}
              placeholder="どんな人が、どこへ辿り着くための道か"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>
          <ChoiceGroup label="カテゴリ">
            {CATEGORIES.map((c) => (
              <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>{categoryLabel[c]}</Chip>
            ))}
          </ChoiceGroup>
          <ChoiceGroup label="難易度">
            {DIFFICULTIES.map((d) => (
              <Chip key={d} selected={difficulty === d} onClick={() => setDifficulty(d)}>{difficultyLabel[d]}</Chip>
            ))}
          </ChoiceGroup>
          <Input
            label="全体の目安（日数）"
            name="days"
            type="number"
            inputMode="numeric"
            min={1}
            max={3650}
            placeholder="例：90"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            error={show(errors.days)}
            className="max-w-40"
          />
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-muted">公開範囲</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {VISIBILITIES.map((v) => (
                <label
                  key={v}
                  className={`cursor-pointer rounded-xl border p-3 text-sm ${visibility === v ? "border-accent bg-wash" : "border-line bg-white"}`}
                >
                  <input type="radio" name="visibility" className="sr-only" checked={visibility === v} onChange={() => setVisibility(v)} />
                  <span className="block font-medium">{visibilityLabel[v].title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{visibilityLabel[v].description}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-medium">道順（本）</h2>
            <span className="text-xs text-muted">{steps.length} 冊</span>
          </div>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={step.book.id}>
                <Card className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 text-xs font-bold text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <BookCover book={step.book} width={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{step.book.title}</p>
                      <p className="truncate text-xs text-muted">{step.book.author}</p>
                    </div>
                    <div className="flex shrink-0">
                      <IconButton label={`${step.book.title}を上へ`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></IconButton>
                      <IconButton label={`${step.book.title}を下へ`} disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></IconButton>
                      <IconButton label={`${step.book.title}を削除`} onClick={() => setSteps((list) => list.filter((_, j) => j !== i))}><Trash2 size={16} /></IconButton>
                    </div>
                  </div>
                  <Input
                    label="Checkpoint（この一冊の到達点） *"
                    name={`checkpoint-${i}`}
                    maxLength={500}
                    placeholder="例：HTTPリクエストの基本構造を説明できる"
                    value={step.checkpoint}
                    onChange={(e) => updateStep(i, { checkpoint: e.target.value })}
                    error={show(stepErrors[i]?.checkpoint)}
                  />
                  <Input
                    label="Why this book?"
                    name={`why-${i}`}
                    maxLength={2000}
                    placeholder="この本を選んだ理由"
                    value={step.description}
                    onChange={(e) => updateStep(i, { description: e.target.value })}
                  />
                  <Input
                    label="目安（日数）"
                    name={`days-${i}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={3650}
                    placeholder="例：14"
                    value={step.days}
                    onChange={(e) => updateStep(i, { days: e.target.value })}
                    error={show(stepErrors[i]?.days)}
                    className="max-w-40"
                  />
                </Card>
              </li>
            ))}
          </ol>
          <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => setPicking(true)}>
            <Plus size={16} /> 本を追加する
          </Button>
          {show(errors.steps) && <p className="mt-2 text-xs text-error">{errors.steps}</p>}
        </section>

        {create.error && <ErrorMessage error={create.error} />}
        <Button type="submit" className="w-full" loading={create.isPending}>
          Roadmapを保存する
        </Button>
      </form>

      {picking && (
        <BookPicker
          exclude={steps.map((s) => s.book.id)}
          onClose={() => setPicking(false)}
          onPick={(book) => setSteps((list) => [...list, { book, checkpoint: "", description: "", days: "" }])}
        />
      )}
    </Page>
  );
}

function ChoiceGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
        selected ? "border-accent bg-accent text-white" : "border-line bg-white hover:bg-wash"
      }`}
    >
      {children}
    </button>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full p-2 text-muted hover:bg-wash hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}
