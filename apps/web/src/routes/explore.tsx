import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Button, ButtonLink, Empty, ErrorMessage, Loading, Page } from "@/components/ui";
import { RoadmapCard } from "@/components/roadmap/RoadmapCard";
import { useRoadmapList } from "@/hooks/roadmap/queries";
import { CATEGORIES, categoryLabel, type Category } from "@/lib/roadmap/labels";

// 検索語とカテゴリは URL (?q=&category=) に持たせ、戻る・共有しても同じ結果になるようにする
export default function Explore() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = CATEGORIES.find((c) => c === params.get("category"));
  const [input, setInput] = useState(q);

  // 入力のたびに API を呼ばないよう、少し待ってから URL に反映する
  useEffect(() => {
    const timer = setTimeout(() => update({ q: input.trim() || undefined }), 300);
    return () => clearTimeout(timer);
  }, [input]);

  function update(next: { q?: string; category?: Category }) {
    const merged = { q: q || undefined, category, ...next };
    const search = new URLSearchParams();
    if (merged.q) search.set("q", merged.q);
    if (merged.category) search.set("category", merged.category);
    if (search.toString() !== params.toString()) setParams(search, { replace: true });
  }

  const list = useRoadmapList({ q: q || undefined, category });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Page eyebrow="Explore" title="どこへ向かうか。どの道を辿るか。">
      <label className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 focus-within:border-accent">
        <Search size={18} className="shrink-0 text-muted" />
        <input
          type="search"
          aria-label="Roadmapを検索"
          placeholder="Roadmap、テーマで検索"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full bg-transparent py-3.5 text-sm outline-none"
        />
      </label>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {[undefined, ...CATEGORIES].map((c) => (
          <button
            key={c ?? "all"}
            type="button"
            aria-pressed={category === c}
            onClick={() => update({ category: c })}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs transition-colors ${
              category === c ? "border-accent bg-accent text-white" : "border-line bg-white text-ink hover:bg-wash"
            }`}
          >
            {c ? categoryLabel[c] : "すべて"}
          </button>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-medium">{q ? "検索結果" : category ? categoryLabel[category] : "Curated paths"}</h2>
          {list.isSuccess && <span className="text-xs text-muted">{items.length}{list.hasNextPage && "+"} roadmaps</span>}
        </div>

        {list.isPending ? (
          <Loading />
        ) : list.isError ? (
          <ErrorMessage error={list.error} onRetry={() => list.refetch()} />
        ) : items.length === 0 ? (
          <Empty title="まだ見ぬ道を、つくろう。">
            <p>条件に合う Roadmap がありません。検索語やカテゴリを変えてみてください。</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {(q || category) && (
                <Button variant="secondary" onClick={() => { setInput(""); setParams({}, { replace: true }); }}>
                  条件をリセット
                </Button>
              )}
              <ButtonLink to="/roadmaps/new">Roadmapをつくる</ButtonLink>
            </div>
          </Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((roadmap) => (
              <RoadmapCard key={roadmap.id} roadmap={roadmap} />
            ))}
          </div>
        )}

        {list.hasNextPage && (
          <div className="mt-6 text-center">
            <Button variant="secondary" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
              もっと見る
            </Button>
          </div>
        )}
      </section>

      <p className="mt-12 text-center text-xs text-muted">一冊の出会いが、次の道をひらく。</p>
    </Page>
  );
}
