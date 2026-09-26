import { ArrowUpRight, BookOpen, Route, Users } from "lucide-react";
import { Link } from "react-router";
import { periodLabel, targetTypeLabel, visibilityLabel } from "@/lib/circle/format";

type CircleSummary = {
  id: string;
  name: string;
  description: string | null;
  targetType: "BOOK" | "ROADMAP";
  visibility: "PUBLIC" | "INVITE_ONLY";
  startDate: string | null;
  targetEndDate: string | null;
  maxMembers: number;
  memberCount: number;
  target:
    | { type: "BOOK"; book: { title: string } }
    | { type: "ROADMAP"; roadmap: { title: string } };
};

/** 一覧に並べるサークルのカード */
export function CircleCard({ circle }: { circle: CircleSummary }) {
  const TargetIcon = circle.targetType === "BOOK" ? BookOpen : Route;
  return (
    <Link
      to={`/circles/${circle.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-colors hover:border-accent/40"
    >
      <div className="flex-1 space-y-3 p-5">
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <TargetIcon size={14} className="shrink-0 text-accent" />
            <span className="truncate">
              {targetTypeLabel(circle.targetType)}「{circle.target.type === "BOOK" ? circle.target.book.title : circle.target.roadmap.title}」を一緒に
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-wash px-2.5 py-0.5 text-[11px] text-accent">
            {visibilityLabel(circle.visibility)}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <h2 className="flex-1 font-serif text-xl leading-snug">{circle.name}</h2>
          <ArrowUpRight size={16} className="mt-1 shrink-0 text-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
        {circle.description && <p className="line-clamp-2 text-sm text-muted">{circle.description}</p>}
      </div>
      <div className="flex items-center justify-between gap-3 bg-wash px-5 py-3 text-xs">
        <span className="text-muted">{periodLabel(circle.startDate, circle.targetEndDate)}</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-accent">
          <Users size={14} />
          {circle.memberCount} / {circle.maxMembers}
        </span>
      </div>
    </Link>
  );
}
