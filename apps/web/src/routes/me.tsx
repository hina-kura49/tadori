import { ArrowRight, LogOut, Settings } from "lucide-react";
import { Link } from "react-router";
import { Button, ButtonLink, Card, ErrorMessage, Label, Loading, Page } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { useDashboard } from "@/hooks/me/useDashboard";
import { useLeave } from "@/hooks/me/useSignOut";
import { summarize } from "@/lib/me/progress";

export default function Me() {
  const { data: d, isPending, error, refetch } = useDashboard();
  const leave = useLeave();
  if (isPending) return <Loading />;
  if (error) return <Page><ErrorMessage error={error} onRetry={() => refetch()} /></Page>;

  const mine = d.userRoadmaps.flatMap((userRoadmap) => {
    const roadmap = d.roadmaps.find((r) => r.id === userRoadmap.roadmapId);
    return roadmap ? [{ roadmap, userRoadmap, s: summarize(roadmap, userRoadmap) }] : [];
  });
  const booksRead = mine.reduce((sum, m) => sum + m.s.done, 0);
  const completed = mine.filter((m) => m.s.complete).length;
  const created = d.roadmaps.filter((r) => r.creator.id === d.user.id);
  const circles = d.circles.filter((c) => c.viewerRole !== null).length;

  return (
    <Page
      eyebrow="Me"
      title="Your journey"
      actions={
        <Link to="/settings" aria-label="設定" className="rounded-full p-2 text-accent hover:bg-wash">
          <Settings size={20} />
        </Link>
      }
    >
      <div className="space-y-8">
        <section className="flex items-center gap-4">
          <Avatar name={d.user.name} url={d.user.avatarUrl} size={64} />
          <div className="min-w-0">
            <p className="truncate text-2xl font-medium">{d.user.name}</p>
            <p className="text-xs text-muted">@{d.user.username}</p>
          </div>
        </section>
        {d.user.bio ? <p className="text-sm leading-7 whitespace-pre-wrap">{d.user.bio}</p> : (
          <p className="text-sm text-muted">
            自己紹介はまだありません。<Link to="/settings" className="text-accent underline">設定</Link>から追加できます。
          </p>
        )}

        <dl className="grid grid-cols-3 gap-3">
          {[
            ["読んだ本", booksRead],
            ["歩ききった道", completed],
            ["サークル", circles],
          ].map(([label, value]) => (
            <Card key={label} className="p-4 text-center">
              <dd className="font-serif text-2xl">{value}</dd>
              <dt className="mt-1 text-[11px] text-muted">{label}</dt>
            </Card>
          ))}
        </dl>

        <section className="space-y-3">
          <Label>Your paths</Label>
          {mine.length === 0 ? (
            <p className="text-sm text-muted">まだ歩いている道はありません。</p>
          ) : (
            <ul className="divide-y divide-line">
              {mine.map(({ roadmap, userRoadmap, s }) => (
                <li key={userRoadmap.userRoadmapId}>
                  <Link to={`/roadmaps/${roadmap.slug}`} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-lg">{roadmap.title}</span>
                      <span className="text-xs text-muted">
                        {s.complete ? "完走" : userRoadmap.status === "PAUSED" ? "一時停止中" : "学習中"} · {s.done} / {s.steps.length} 冊
                      </span>
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-accent" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {created.length > 0 && (
          <section className="space-y-3">
            <Label>Created by you</Label>
            <ul className="divide-y divide-line">
              {created.map((roadmap) => (
                <li key={roadmap.id}>
                  <Link to={`/roadmaps/${roadmap.slug}`} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-lg">{roadmap.title}</span>
                      <span className="text-xs text-muted">
                        {roadmap.stepCount} 冊 · {roadmap.visibility === "PUBLIC" ? "公開" : "非公開"}
                      </span>
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-accent" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row">
          <ButtonLink to={`/profile/${d.user.username}`} variant="secondary" className="flex-1">
            公開プロフィールを見る
          </ButtonLink>
          <Button variant="ghost" className="flex-1" loading={leave.isPending} onClick={() => leave.mutate("signout")}>
            <LogOut size={16} />
            ログアウト
          </Button>
        </div>
        {leave.error && <p className="text-sm text-error">{leave.error.message}</p>}
      </div>
    </Page>
  );
}
