import { Link, useParams } from "react-router";
import { ApiError } from "@/api/client";
import { ButtonLink, Empty, ErrorMessage, Loading, Page } from "@/components/ui";
import { RoadmapHeader } from "@/components/roadmap/RoadmapHeader";
import { StepTimeline } from "@/components/roadmap/StepTimeline";
import { useRoadmap } from "@/hooks/roadmap/queries";
import { useMe } from "@/hooks/useMe";

// シェアされたリンクの着地ページ。ログインしていなくても道のりを見られる。
export default function PublicRoadmap() {
  const { slug = "" } = useParams();
  const query = useRoadmap(slug);
  const me = useMe();
  const detailPath = `/roadmaps/${slug}`;
  const loggedIn = !!me.data;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-6">
          <Link to={loggedIn ? "/" : "/login"} className="font-serif text-xl">
            Tadori
          </Link>
          {!me.isPending && !loggedIn && (
            <Link to={`/login?next=${encodeURIComponent(detailPath)}`} className="text-sm text-accent">
              ログイン
            </Link>
          )}
        </div>
      </header>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Page>
          {query.error instanceof ApiError && query.error.status === 404 ? (
            <Empty title="道が見つかりませんでした">
              <p>非公開になったか、リンクが間違っている可能性があります。</p>
            </Empty>
          ) : (
            <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
          )}
        </Page>
      ) : (
        <Page>
          <RoadmapHeader roadmap={query.data} />
          <div className="mt-6 rounded-2xl border border-accent/25 bg-wash p-5">
            <p className="font-serif text-lg">この道を、あなたも辿ってみませんか。</p>
            <p className="mt-1 text-xs text-muted">Tadori で進み具合を記録しながら、一冊ずつ進められます。</p>
            <ButtonLink
              className="mt-4"
              to={loggedIn ? detailPath : `/login?next=${encodeURIComponent(detailPath)}`}
            >
              {loggedIn ? "このRoadmapを開く" : "ログインして始める"}
            </ButtonLink>
          </div>
          <section className="mt-10">
            <StepTimeline roadmap={query.data} />
          </section>
        </Page>
      )}
    </div>
  );
}
