import { Check, Pause, Play, Share2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "@/api/client";
import { Button, ButtonLink, Empty, ErrorMessage, Loading, Page } from "@/components/ui";
import { ProgressBar } from "@/components/roadmap/ProgressBar";
import { RoadmapHeader } from "@/components/roadmap/RoadmapHeader";
import { StepTimeline, stepStates } from "@/components/roadmap/StepTimeline";
import { useRoadmap, useSetRoadmapStatus, useStartRoadmap } from "@/hooks/roadmap/queries";
import { shareRoadmap } from "@/lib/roadmap/share";

export default function RoadmapDetailScreen() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const query = useRoadmap(slug);
  const start = useStartRoadmap(slug);
  const setStatus = useSetRoadmapStatus(slug);
  const [shared, setShared] = useState<string>();

  if (query.isPending) return <Loading />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) return <NotFound />;
    return (
      <Page>
        <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
      </Page>
    );
  }

  const roadmap = query.data;
  const progress = roadmap.userProgress;
  const states = stepStates(roadmap);
  const done = states.filter((s) => s === "COMPLETED").length;
  const complete = progress?.status === "COMPLETED";
  const paused = progress?.status === "PAUSED";
  const current = roadmap.steps[states.indexOf("CURRENT")];
  const stepHref = (step: (typeof roadmap.steps)[number]) =>
    `/books/${step.book.id}?roadmap=${encodeURIComponent(roadmap.slug)}&step=${step.id}`;

  async function onStart() {
    await start.mutateAsync(roadmap.id);
    const first = roadmap.steps[0];
    if (first) navigate(stepHref(first));
  }

  return (
    <Page>
      <RoadmapHeader
        roadmap={roadmap}
        actions={
          roadmap.visibility !== "PRIVATE" && (
            <button
              type="button"
              aria-label="Roadmapを共有"
              onClick={async () => setShared(await shareRoadmap(roadmap))}
              className="rounded-full p-2 text-accent hover:bg-wash"
            >
              <Share2 size={19} />
            </button>
          )
        }
      />
      {shared && <p className="mt-2 text-right text-xs text-accent">{shared}</p>}

      <section className="mt-6 space-y-3">
        {progress && (
          <>
            <ProgressBar value={progress.progressPercentage} />
            <p className="text-xs text-accent">
              {done} / {roadmap.steps.length} 冊完了 · {progress.progressPercentage}%
              {paused && " · 一時停止中"}
            </p>
          </>
        )}
        <ErrorMessageIf error={start.error ?? setStatus.error} />
        <div className="flex flex-wrap gap-2">
          {complete ? (
            <Button disabled>
              <Check size={16} /> Roadmap completed
            </Button>
          ) : !progress ? (
            <Button loading={start.isPending} disabled={roadmap.steps.length === 0} onClick={onStart}>
              このRoadmapで学ぶ
            </Button>
          ) : paused ? (
            <Button
              loading={setStatus.isPending}
              onClick={() => setStatus.mutate({ userRoadmapId: progress.userRoadmapId, status: "IN_PROGRESS" })}
            >
              <Play size={16} /> 学習を再開する
            </Button>
          ) : (
            current && <ButtonLink to={stepHref(current)}>続きから進める</ButtonLink>
          )}
          {progress && !complete && !paused && (
            <Button
              variant="ghost"
              loading={setStatus.isPending}
              onClick={() => setStatus.mutate({ userRoadmapId: progress.userRoadmapId, status: "PAUSED" })}
            >
              <Pause size={16} /> 一時停止
            </Button>
          )}
        </div>
      </section>

      <section className="mt-10">
        {roadmap.steps.length === 0 ? (
          <Empty title="まだ本が登録されていません" />
        ) : (
          <StepTimeline roadmap={roadmap} stepHref={stepHref} />
        )}
      </section>
      <p className="mt-10 text-center text-xs text-muted">道順はガイド。気になる本から進めても大丈夫。</p>
    </Page>
  );
}

function ErrorMessageIf({ error }: { error: unknown }) {
  return error ? <ErrorMessage error={error} /> : null;
}

function NotFound() {
  return (
    <Page>
      <Empty title="道が見つかりませんでした">
        <p>リンクを確認するか、Explore から探してみてください。</p>
        <Link to="/explore" className="mt-4 inline-block text-accent underline">
          Exploreへ
        </Link>
      </Empty>
    </Page>
  );
}
