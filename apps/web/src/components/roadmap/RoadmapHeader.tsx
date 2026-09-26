import { BookOpen, Clock3 } from "lucide-react";
import type { ReactNode } from "react";
import { Label } from "@/components/ui";
import type { RoadmapDetail } from "@/hooks/roadmap/queries";
import { categoryLabel, difficultyLabel, formatDays, visibilityLabel } from "@/lib/roadmap/labels";

/** ロードマップ詳細の見出し部分。詳細画面と公開ページで共通 */
export function RoadmapHeader({ roadmap, actions }: { roadmap: RoadmapDetail; actions?: ReactNode }) {
  const days = formatDays(roadmap.estimatedDays);
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Label>
          {categoryLabel[roadmap.category]}
          {roadmap.visibility !== "PUBLIC" && ` · ${visibilityLabel[roadmap.visibility].title}`}
        </Label>
        {actions}
      </div>
      <h1 className="font-serif text-3xl leading-tight tracking-tight md:text-4xl">{roadmap.title}</h1>
      {roadmap.description && <p className="text-sm leading-7 text-muted">{roadmap.description}</p>}
      <p className="flex items-center gap-2 text-xs text-muted">
        <span className="flex size-6 items-center justify-center rounded-full bg-wash text-[10px] font-bold text-accent">
          {roadmap.creator.name.slice(0, 1)}
        </span>
        A path by {roadmap.creator.name}
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <BookOpen size={14} />
          {roadmap.steps.length} 冊
        </span>
        <span>{difficultyLabel[roadmap.difficulty]}</span>
        {days && (
          <span className="inline-flex items-center gap-1">
            <Clock3 size={13} />
            {days}
          </span>
        )}
        {roadmap.completedUserCount > 0 && <span>{roadmap.completedUserCount} 人が完走</span>}
      </p>
    </section>
  );
}
