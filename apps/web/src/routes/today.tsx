import { ArrowRight, ArrowUpRight, Bell, Pause, Play, Route } from "lucide-react";
import { Link } from "react-router";
import { ButtonLink, Card, Empty, ErrorMessage, Label, Loading, Page } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { PathRail } from "@/components/me/PathRail";
import { ProgressEditor } from "@/components/me/ProgressEditor";
import { useDashboard, useUpdateRoadmapStatus } from "@/hooks/me/useDashboard";
import { stepPercentage, summarize } from "@/lib/me/progress";

const greeting = (hour: number) =>
  hour < 12 ? "Good morning." : hour < 18 ? "A little further, today." : "Good evening.";

export default function Today() {
  const { data: d, isPending, error, refetch } = useDashboard();
  const status = useUpdateRoadmapStatus();
  if (isPending) return <Loading />;
  if (error) return <Page><ErrorMessage error={error} onRetry={() => refetch()} /></Page>;

  // 学習中 (未完了) のロードマップ。先頭をメインとして大きく出す
  const paths = d.userRoadmaps.flatMap((userRoadmap) => {
    const roadmap = d.roadmaps.find((r) => r.id === userRoadmap.roadmapId);
    if (!roadmap) return [];
    const s = summarize(roadmap, userRoadmap);
    return s.complete ? [] : [{ roadmap, userRoadmap, s }];
  });
  const active = paths.filter((p) => p.userRoadmap.status === "IN_PROGRESS");
  const paused = paths.filter((p) => p.userRoadmap.status === "PAUSED");
  const main = active[0];
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", weekday: "long" });

  return (
    <Page
      eyebrow={date}
      title="Today"
      actions={
        <div className="flex items-center gap-2">
          <Link to="/settings#notifications" aria-label="通知設定" className="rounded-full p-2 text-accent hover:bg-wash">
            <Bell size={20} />
          </Link>
          <Link to="/me" aria-label="プロフィール">
            <Avatar name={d.user.name} url={d.user.avatarUrl} size={34} />
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        <div className="space-y-1">
          <p className="font-serif text-2xl">{greeting(new Date().getHours())}</p>
          <p className="text-sm text-muted">今日の一歩が、明日のあなたにつながる。</p>
        </div>

        {main && main.s.current ? (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Your path</Label>
                <Link to={`/roadmaps/${main.roadmap.slug}`} aria-label="ロードマップを見る" className="text-accent">
                  <ArrowUpRight size={19} />
                </Link>
              </div>
              <h2 className="font-serif text-2xl leading-snug">{main.roadmap.title}</h2>
              <PathRail
                count={main.s.steps.length}
                current={main.s.index}
                completed={main.s.steps.flatMap((step, i) => (main.s.progressOf(step.id)?.status === "COMPLETED" ? [i] : []))}
              />
              <div className="flex justify-between text-xs">
                <span className="text-muted">
                  {main.s.done} / {main.s.steps.length} books completed
                </span>
                <span className="text-accent">一歩ずつ、着実に。</span>
              </div>
            </section>

            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between bg-wash px-5 py-2.5 text-accent">
                <span className="text-xs font-medium">いま、ここ</span>
                <span className="text-[10px] tracking-widest">STEP {String(main.s.index + 1).padStart(2, "0")}</span>
              </div>
              <div className="space-y-5 p-5">
                <div className="flex items-center gap-4">
                  <BookCover book={main.s.current.book} width={80} />
                  <div className="min-w-0 space-y-1">
                    <Link to={`/books/${main.s.current.book.id}`} className="block text-lg leading-snug font-semibold hover:underline">
                      {main.s.current.book.title}
                    </Link>
                    <p className="text-xs text-muted">{main.s.current.book.author}</p>
                  </div>
                </div>
                <div className="space-y-1 border-l-2 border-[#9CAF9F] pl-3">
                  <p className="text-xs text-muted">Checkpoint</p>
                  <p className="text-sm leading-6">{main.s.current.checkpoint}</p>
                </div>
                <ProgressEditor
                  key={main.s.current.id}
                  userRoadmapId={main.userRoadmap.userRoadmapId}
                  stepId={main.s.current.id}
                  percentage={stepPercentage(main.s.progressOf(main.s.current.id))}
                />
              </div>
            </Card>

            {main.s.next && (
              <Link to={`/roadmaps/${main.roadmap.slug}`} className="flex items-center gap-4 rounded-xl p-1 hover:bg-wash">
                <BookCover book={main.s.next.book} width={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">Next step</p>
                  <p className="truncate text-sm">{main.s.next.book.title}</p>
                </div>
                <ArrowRight size={17} className="text-muted" />
              </Link>
            )}

            <button
              onClick={() => status.mutate({ userRoadmapId: main.userRoadmap.userRoadmapId, status: "PAUSED" })}
              disabled={status.isPending}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
            >
              <Pause size={14} />
              このロードマップを一時停止する
            </button>
          </>
        ) : (
          <Empty title={d.userRoadmaps.length > 0 && active.length === 0 && paused.length === 0 ? "すべての道を歩ききりました。" : "最初の道を選びましょう。"}>
            <p>気になるロードマップを見つけて、一冊目から始めてみましょう。</p>
            <ButtonLink to="/explore" className="mt-5">
              ロードマップを探す
            </ButtonLink>
          </Empty>
        )}

        {(active.length > 1 || paused.length > 0) && (
          <section className="space-y-3 border-t border-line pt-6">
            <h2 className="font-medium">Other paths</h2>
            <ul className="divide-y divide-line">
              {active.slice(1).map(({ roadmap, s }) => (
                <li key={roadmap.id}>
                  <Link to={`/roadmaps/${roadmap.slug}`} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-lg">{roadmap.title}</span>
                      <span className="text-xs text-muted">
                        {s.done} / {s.steps.length} 冊
                      </span>
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-accent" />
                  </Link>
                </li>
              ))}
              {paused.map(({ roadmap, userRoadmap, s }) => (
                <li key={roadmap.id} className="flex items-center justify-between gap-3 py-3">
                  <Link to={`/roadmaps/${roadmap.slug}`} className="min-w-0">
                    <span className="block truncate font-serif text-lg text-muted">{roadmap.title}</span>
                    <span className="text-xs text-muted">
                      一時停止中 · {s.done} / {s.steps.length} 冊
                    </span>
                  </Link>
                  <button
                    onClick={() => status.mutate({ userRoadmapId: userRoadmap.userRoadmapId, status: "IN_PROGRESS" })}
                    disabled={status.isPending}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs text-accent hover:bg-wash"
                  >
                    <Play size={14} />
                    再開
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {status.error && <p className="text-sm text-error">{status.error.message}</p>}

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
          <Route size={15} />
          速さよりも、昨日より少し先へ。
        </p>
      </div>
    </Page>
  );
}
