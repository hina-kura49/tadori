import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { api, ApiError, unwrap } from "@/api/client";
import { Avatar } from "@/components/Avatar";
import { ButtonLink, Card, Empty, ErrorMessage, Label, Loading, Page } from "@/components/ui";
import { useMe } from "@/hooks/useMe";

/** /profile/:username — 他の人の公開プロフィール (Learning Profile) */
export default function Profile() {
  const { username = "" } = useParams();
  const { data: me } = useMe();
  const q = useQuery({
    queryKey: ["users", username],
    queryFn: () => unwrap(api.users[":username"].$get({ param: { username } })),
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
  });

  if (q.isPending) return <Loading />;
  if (q.error) {
    // 存在しない username や、形式が正しくない username は「見つからない」として扱う
    if (q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 400)) {
      return (
        <Page>
          <Empty title="Profileが見つかりません">
            <p>ユーザー名を確認してください。</p>
          </Empty>
        </Page>
      );
    }
    return <Page><ErrorMessage error={q.error} onRetry={() => q.refetch()} /></Page>;
  }

  const { user, stats, currentRoadmaps, completedRoadmaps, createdRoadmaps } = q.data;
  const isMe = me?.username === user.username;
  const since = new Date(user.createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

  return (
    <Page>
      <Label>Learning profile</Label>
      <header className="mt-4 mb-8 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} url={user.avatarUrl} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-3xl">{user.name}</h1>
            <p className="text-sm text-muted">@{user.username} · {since}から</p>
          </div>
          {isMe && <ButtonLink to="/me" variant="secondary" className="shrink-0">自分のページ</ButtonLink>}
        </div>
        {user.bio && <p className="text-sm whitespace-pre-wrap text-muted">{user.bio}</p>}
      </header>

      <div className="mb-10 grid grid-cols-2 gap-3">
        <Stat value={stats.booksCompleted} label="読み終えた本" />
        <Stat value={stats.roadmapsCompleted} label="辿り終えたロードマップ" />
      </div>

      <div className="space-y-10">
        {currentRoadmaps.length > 0 && (
          <Section title="いま辿っている">
            {currentRoadmaps.map((r) => (
              <ProgressRow key={r.roadmap.id} slug={r.roadmap.slug} title={r.roadmap.title} percent={r.progressPercentage} paused={r.status === "PAUSED"} />
            ))}
          </Section>
        )}
        {completedRoadmaps.length > 0 && (
          <Section title="辿り終えた">
            {completedRoadmaps.map((r) => (
              <ProgressRow key={r.roadmap.id} slug={r.roadmap.slug} title={r.roadmap.title} percent={100} completedAt={r.completedAt} />
            ))}
          </Section>
        )}
        {createdRoadmaps.length > 0 && (
          <Section title="つくったロードマップ">
            <div className="grid gap-3 md:grid-cols-2">
              {createdRoadmaps.map((r) => (
                <Link key={r.id} to={`/roadmaps/${r.slug}`} className="group rounded-2xl border border-line bg-white p-5 hover:border-accent/40">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 font-serif text-lg leading-snug">{r.title}</p>
                    <ArrowUpRight size={16} className="mt-1 shrink-0 text-accent" />
                  </div>
                  {r.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{r.description}</p>}
                  <p className="mt-3 text-xs text-muted">{r.stepCount}冊 · {r.completedUserCount}人が完走</p>
                </Link>
              ))}
            </div>
          </Section>
        )}
        {!currentRoadmaps.length && !completedRoadmaps.length && !createdRoadmaps.length && (
          <Empty title="まだ公開されている道のりはありません" />
        )}
      </div>
    </Page>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card className="text-center">
      <p className="font-serif text-3xl text-accent">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

function ProgressRow({ slug, title, percent, paused, completedAt }: {
  slug: string;
  title: string;
  percent: number;
  paused?: boolean;
  completedAt?: string | null;
}) {
  return (
    <Link to={`/roadmaps/${slug}`} className="block rounded-2xl border border-line bg-white p-4 hover:border-accent/40">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-medium">{title}</p>
        <span className="shrink-0 text-xs text-accent">
          {completedAt ? `${new Date(completedAt).toLocaleDateString("ja-JP")} 完走` : paused ? "一時停止中" : `${percent}%`}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-wash" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
    </Link>
  );
}
