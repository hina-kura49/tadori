import { data, Link } from "react-router";
import { ApiError } from "@/api/client";
import { ButtonLink, Empty, ErrorMessage, Loading, Page } from "@/components/ui";
import { RoadmapHeader } from "@/components/roadmap/RoadmapHeader";
import { StepTimeline } from "@/components/roadmap/StepTimeline";
import { useRoadmap } from "@/hooks/roadmap/queries";
import { useMe } from "@/hooks/useMe";
import { fetchSharedRoadmap } from "@/lib/roadmap/share.server";
import type { Route } from "./+types/public-roadmap";

// シェアされたリンクの着地ページ。ログインしていなくても道のりを見られる。
// SNS やチャットのリンクプレビューに中身が出るよう、HTML をサーバーで作る (SSR)。

export async function loader({ request, params }: Route.LoaderArgs) {
  const result = await fetchSharedRoadmap(params.slug, request.headers.get("cookie"));
  const url = new URL(request.url);
  const page = { url: `${url.origin}${url.pathname}`, image: `${url.origin}/icon.png` };
  if (result.status === "not-found") return data({ ...page, roadmap: undefined, notFound: true }, { status: 404 });
  return { ...page, roadmap: result.status === "found" ? result.roadmap : undefined, notFound: false };
}

export const meta: Route.MetaFunction = ({ data }) => {
  const roadmap = data?.roadmap;
  if (!roadmap) return [{ title: data?.notFound ? "道が見つかりませんでした | Readtree" : "Readtree" }];
  const title = `${roadmap.title} | Readtree`;
  const description =
    roadmap.description ?? `${roadmap.creator.name} さんが選んだ ${roadmap.stepCount} 冊で辿る学びの道。`;
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: "Readtree" },
    { property: "og:title", content: roadmap.title },
    { property: "og:description", content: description },
    { property: "og:url", content: data.url },
    { property: "og:image", content: data.image },
    { name: "twitter:card", content: "summary" },
  ];
};

export default function PublicRoadmap({ params, loaderData }: Route.ComponentProps) {
  const { slug } = params;
  // サーバーで取れていればそれを使う。API が休止中などで取れなかったときは、ブラウザで取り直す
  const query = useRoadmap(slug, { enabled: !loaderData.notFound, initialData: loaderData.roadmap });
  const me = useMe();
  const detailPath = `/roadmaps/${slug}`;
  const loggedIn = !!me.data;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-6">
          <Link to={loggedIn ? "/" : "/login"} className="font-serif text-xl">
            Readtree
          </Link>
          {!me.isPending && !loggedIn && (
            <Link to={`/login?next=${encodeURIComponent(detailPath)}`} className="text-sm text-accent">
              ログイン
            </Link>
          )}
        </div>
      </header>
      {loaderData.notFound || (query.error instanceof ApiError && query.error.status === 404) ? (
        <Page>
          <Empty title="道が見つかりませんでした">
            <p>非公開になったか、リンクが間違っている可能性があります。</p>
          </Empty>
        </Page>
      ) : query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Page>
          <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
        </Page>
      ) : (
        <Page>
          <RoadmapHeader roadmap={query.data} />
          <div className="mt-6 rounded-2xl border border-accent/25 bg-wash p-5">
            <p className="font-serif text-lg">この道を、あなたも辿ってみませんか。</p>
            <p className="mt-1 text-xs text-muted">Readtree で進み具合を記録しながら、一冊ずつ進められます。</p>
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
