import { ArrowRight, Check, Flag } from "lucide-react";
import { Link } from "react-router";
import type { RoadmapDetail } from "@/hooks/roadmap/queries";
import { formatDays } from "@/lib/roadmap/labels";
import { BookCover } from "@/components/BookCover";
import { Label } from "@/components/ui";

type StepState = "COMPLETED" | "CURRENT" | "READING" | "AVAILABLE";

/** 各ステップの状態。最初の未完了ステップを「現在地」とする (mobile の lib/progress.ts と同じ考え方) */
export function stepStates(roadmap: RoadmapDetail): StepState[] {
  const progress = roadmap.userProgress;
  if (!progress) return roadmap.steps.map(() => "AVAILABLE");
  const statusOf = (stepId: string) => progress.steps.find((s) => s.stepId === stepId)?.status;
  const currentIndex = roadmap.steps.findIndex((s) => statusOf(s.id) !== "COMPLETED");
  return roadmap.steps.map((step, i) => {
    const status = statusOf(step.id);
    if (status === "COMPLETED") return "COMPLETED";
    if (i === currentIndex) return "CURRENT";
    return status === "READING" ? "READING" : "AVAILABLE";
  });
}

/**
 * ロードマップの道のり。
 * stepHref を渡すと各ステップがリンクになる (公開ページではログイン導線に差し替える)
 */
export function StepTimeline({ roadmap, stepHref }: {
  roadmap: RoadmapDetail;
  stepHref?: (step: RoadmapDetail["steps"][number]) => string;
}) {
  const states = stepStates(roadmap);
  const complete = roadmap.userProgress?.status === "COMPLETED";
  return (
    <ol className="mt-2">
      <li className="mb-5 flex items-center gap-4">
        <span className="flex w-9 justify-center text-accent">
          <Flag size={17} />
        </span>
        <Label>Your path starts here</Label>
      </li>
      {roadmap.steps.map((step, i) => {
        const state = states[i]!;
        const done = state === "COMPLETED";
        const current = state === "CURRENT";
        const body = (
          <div className={`flex-1 rounded-xl ${current ? "border border-accent/25 bg-wash p-4" : "py-0.5"} space-y-3`}>
            {current && <Label>● You are here</Label>}
            <div className="flex items-start gap-4">
              <BookCover book={step.book} width={52} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{step.book.title}</p>
                <p className="mt-1 text-xs text-muted">{step.book.author}</p>
                <p className="mt-1 text-xs text-muted">
                  {[formatDays(step.estimatedDays), done && "完了", state === "READING" && "読書中"].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div>
              <p className={`text-[9px] font-bold tracking-[0.15em] ${current ? "text-accent" : "text-muted"}`}>CHECKPOINT</p>
              <p className={`mt-1 text-sm leading-relaxed ${done ? "text-muted" : ""}`}>{step.checkpoint}</p>
            </div>
            {current && stepHref && (
              <p className="flex items-center justify-between text-xs text-accent">
                この一冊を進める <ArrowRight size={15} />
              </p>
            )}
          </div>
        );
        return (
          <li key={step.id} className="flex gap-4">
            <div className="flex w-9 shrink-0 flex-col items-center">
              <span
                className={`flex size-8 items-center justify-center rounded-full text-[11px] ${
                  done
                    ? "bg-accent text-white"
                    : current
                      ? "border-4 border-[#C6D5CB] bg-accent"
                      : "border border-[#CED2CC] bg-paper text-muted"
                }`}
              >
                {done ? <Check size={16} /> : current ? <span className="size-2 rounded-full bg-white" /> : String(i + 1).padStart(2, "0")}
              </span>
              <span className={`min-h-10 w-px flex-1 ${done ? "bg-[#739086]" : "bg-line"}`} />
            </div>
            <div className="mb-6 flex-1">
              {stepHref ? (
                <Link
                  to={stepHref(step)}
                  aria-label={`${step.book.title}、${done ? "完了" : current ? "現在地" : "未着手"}`}
                  className="block rounded-xl transition-opacity hover:opacity-80"
                >
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          </li>
        );
      })}
      <li className="flex items-center gap-4">
        <span
          className={`flex size-9 items-center justify-center rounded-full border ${
            complete ? "border-accent bg-accent text-white" : "border-line bg-paper text-muted"
          }`}
        >
          <Flag size={15} />
        </span>
        <div>
          <Label>{complete ? "You made it." : "A new perspective awaits."}</Label>
          <p className="mt-1 text-xs text-muted">
            {complete ? "辿った道が、あなたの力になりました。" : "最後の一冊の先に、新しい自分。"}
          </p>
        </div>
      </li>
    </ol>
  );
}
