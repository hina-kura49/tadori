import { ArrowUpRight, Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ApiError } from "@/api/client";
import { Button, Card, Empty, ErrorMessage, Label, Loading, Page } from "@/components/ui";
import { BookCover } from "@/components/BookCover";
import { ProgressBar } from "@/components/roadmap/ProgressBar";
import { RoadmapCard } from "@/components/roadmap/RoadmapCard";
import {
  useBook,
  useRoadmap,
  useSaveStepProgress,
  useStartRoadmap,
  type RoadmapDetail,
  type RoadmapStep,
} from "@/hooks/roadmap/queries";
import { formatDays } from "@/lib/roadmap/labels";

// /books/:id                           本の情報と、この本を含む公開ロードマップ
// /books/:id?roadmap=<slug>&step=<id>  上に加えて、そのステップの進み具合を記録できる
export default function BookDetail() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const slug = params.get("roadmap") ?? "";
  const stepId = params.get("step");
  const book = useBook(id);
  const roadmap = useRoadmap(slug, { enabled: !!slug });

  if (book.isPending || (slug && roadmap.isPending)) return <Loading />;
  if (book.isError) {
    if (book.error instanceof ApiError && book.error.status === 404)
      return (
        <Page>
          <Empty title="本が見つかりませんでした">
            <Link to="/explore" className="text-accent underline">Exploreへ</Link>
          </Empty>
        </Page>
      );
    return <Page><ErrorMessage error={book.error} onRetry={() => book.refetch()} /></Page>;
  }

  const b = book.data;
  const step = roadmap.data?.steps.find((s) => s.id === stepId && s.book.id === id);
  const stepIndex = step && roadmap.data ? roadmap.data.steps.indexOf(step) : -1;
  const others = b.publicRoadmaps.filter((r) => r.slug !== slug);

  return (
    <Page>
      {roadmap.data && step && (
        <Link
          to={`/roadmaps/${roadmap.data.slug}`}
          className="mb-6 flex items-center justify-between gap-3 text-xs text-muted hover:text-ink"
        >
          <span>
            {roadmap.data.title} · Step {stepIndex + 1} / {roadmap.data.steps.length}
          </span>
          <ArrowUpRight size={16} />
        </Link>
      )}

      <section className="flex items-center gap-5">
        <BookCover book={b} width={96} />
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="font-serif text-2xl leading-snug md:text-3xl">{b.title}</h1>
          {b.subtitle && <p className="text-sm text-muted">{b.subtitle}</p>}
          <p className="text-sm text-muted">{b.author}</p>
          {step && (
            <p className="text-xs text-accent">
              この道の {stepIndex + 1} 冊目{formatDays(step.estimatedDays) && ` · ${formatDays(step.estimatedDays)}`}
            </p>
          )}
        </div>
      </section>

      {roadmap.isError && <div className="mt-6"><ErrorMessage error={roadmap.error} onRetry={() => roadmap.refetch()} /></div>}

      {roadmap.data && step && (
        <>
          <section className="mt-8 space-y-5">
            {step.description && (
              <div>
                <p className="text-xs text-muted">Why this book</p>
                <p className="mt-1 text-sm leading-7">{step.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-accent">この一冊の到達点</p>
              <p className="mt-1 text-lg leading-8 font-medium">{step.checkpoint}</p>
            </div>
          </section>
          <StepProgress roadmap={roadmap.data} step={step} />
        </>
      )}

      {b.description && (
        <section className="mt-10">
          <Label>About this book</Label>
          <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-muted">{b.description}</p>
        </section>
      )}
      {(b.publisher || b.publishedAt || b.isbn13) && (
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-muted">
          {b.publisher && <><dt>出版社</dt><dd>{b.publisher}</dd></>}
          {b.publishedAt && <><dt>出版日</dt><dd>{b.publishedAt}</dd></>}
          {b.isbn13 && <><dt>ISBN</dt><dd>{b.isbn13}</dd></>}
        </dl>
      )}

      {others.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-medium">この本を含む Roadmap</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {others.map((r) => <RoadmapCard key={r.id} roadmap={r} />)}
          </div>
        </section>
      )}
    </Page>
  );
}

/** このステップの進み具合 (0〜100%) を記録する */
function StepProgress({ roadmap, step }: { roadmap: RoadmapDetail; step: RoadmapStep }) {
  const start = useStartRoadmap(roadmap.slug);
  const save = useSaveStepProgress(roadmap.slug);
  const progress = roadmap.userProgress;
  const mine = progress?.steps.find((s) => s.stepId === step.id);
  const percentage = mine?.progressType === "PERCENTAGE" && mine.progressValue ? Number(mine.progressValue) : mine?.status === "COMPLETED" ? 100 : 0;
  const complete = mine?.status === "COMPLETED";
  const reading = mine?.status === "READING";
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(value: number) {
    if (!progress) return;
    setSaved(false);
    await save.mutateAsync({ userRoadmapId: progress.userRoadmapId, stepId: step.id, percentage: value });
    setSaved(true);
    setInput("");
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(input);
    submit(value).catch(() => {});
  }

  return (
    <Card className="mt-8 space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-medium">{complete ? "Checkpoint reached" : reading ? "On your way" : "Not started"}</p>
          <p className="mt-1 text-xs text-muted">
            {complete ? "この一冊が、あなたの力になりました。" : reading ? "昨日より少し先へ。あなたのペースで。" : "最初のページから、一歩ずつ。"}
          </p>
        </div>
        {progress && !complete && <p className="text-2xl text-accent">{percentage}%</p>}
      </div>
      <ProgressBar value={percentage} thin />
      {(save.error || start.error) && <ErrorMessage error={save.error ?? start.error} />}
      {saved && !complete && <p className="text-xs text-accent">進捗を保存しました。今日も一歩、前へ。</p>}

      {!progress ? (
        <Button loading={start.isPending} onClick={() => start.mutate(roadmap.id)}>
          Roadmapを学習に追加
        </Button>
      ) : complete ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-accent">
            <Check size={18} /> このCheckpointに到達しました。
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/roadmaps/${roadmap.slug}`} className="text-sm text-accent underline">
              {progress.status === "COMPLETED" ? "完走したRoadmapを見る" : "次の一冊を確認する"}
            </Link>
            <button type="button" className="text-xs text-muted underline" onClick={() => submit(0).catch(() => {})}>
              未完了に戻す
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[25, 50, 75].filter((v) => v > percentage).map((v) => (
              <Button key={v} type="button" variant="secondary" disabled={save.isPending} onClick={() => submit(v).catch(() => {})}>
                {v}%
              </Button>
            ))}
            <Button type="button" disabled={save.isPending} onClick={() => submit(100).catch(() => {})}>
              <Check size={16} /> 読み終えた
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              aria-label="進捗 (%)"
              placeholder="0〜100"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-28 rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <span className="text-sm text-muted">%</span>
            <Button type="submit" variant="ghost" loading={save.isPending} disabled={input === ""}>
              記録する
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
