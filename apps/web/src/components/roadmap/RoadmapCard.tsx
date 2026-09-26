import { BookOpen, Clock3 } from "lucide-react";
import { Link } from "react-router";
import { Label } from "@/components/ui";
import type { RoadmapSummary } from "@/hooks/roadmap/queries";
import { categoryLabel, difficultyLabel, formatDays } from "@/lib/roadmap/labels";

export function RoadmapCard({ roadmap }: { roadmap: RoadmapSummary }) {
  const days = formatDays(roadmap.estimatedDays);
  return (
    <Link
      to={`/roadmaps/${roadmap.slug}`}
      className="group block rounded-2xl border border-line bg-white p-5 transition-colors hover:border-accent/40"
    >
      <Label>{categoryLabel[roadmap.category]}</Label>
      <h3 className="mt-2 font-serif text-xl leading-snug group-hover:text-accent">{roadmap.title}</h3>
      {roadmap.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{roadmap.description}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <BookOpen size={13} />
          {roadmap.stepCount} 冊
        </span>
        <span>{difficultyLabel[roadmap.difficulty]}</span>
        {days && (
          <span className="inline-flex items-center gap-1">
            <Clock3 size={13} />
            {days}
          </span>
        )}
        <span className="ml-auto">by {roadmap.creator.name}</span>
      </div>
    </Link>
  );
}
