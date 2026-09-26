import { Plus } from "lucide-react";
import { CircleCard } from "@/components/circle/CircleCard";
import { ButtonLink, Empty, ErrorMessage, Label, Loading, Page } from "@/components/ui";
import { useMyCircles, usePublicCircles } from "@/hooks/circle/useCircles";

export default function Circles() {
  const mine = useMyCircles();
  const open = usePublicCircles();
  const myIds = new Set(mine.data?.items.map((c) => c.id));
  const others = open.data?.items.filter((c) => !myIds.has(c.id)) ?? [];

  return (
    <Page
      eyebrow="Circles"
      title="ひとりの一歩が、みんなの続きに。"
      actions={
        <ButtonLink to="/circles/new" className="shrink-0">
          <Plus size={16} />
          <span className="hidden sm:inline">Circleをつくる</span>
        </ButtonLink>
      }
    >
      <section className="space-y-4">
        <Label>参加中</Label>
        {mine.isPending ? (
          <Loading />
        ) : mine.error ? (
          <ErrorMessage error={mine.error} onRetry={() => mine.refetch()} />
        ) : mine.data.items.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {mine.data.items.map((circle) => <CircleCard key={circle.id} circle={circle} />)}
          </div>
        ) : (
          <Empty title="最初の輪をつくる">
            <p>同じ本を読む仲間と、学びを始めましょう。</p>
            <ButtonLink to="/circles/new" className="mt-4">Circleをつくる</ButtonLink>
          </Empty>
        )}
      </section>

      {others.length > 0 && (
        <section className="mt-12 space-y-4">
          <Label>参加できるCircle</Label>
          <div className="grid gap-4 md:grid-cols-2">
            {others.map((circle) => <CircleCard key={circle.id} circle={circle} />)}
          </div>
        </section>
      )}
      {open.error && <div className="mt-8"><ErrorMessage error={open.error} onRetry={() => open.refetch()} /></div>}
    </Page>
  );
}
