import { Check } from "lucide-react";
import { Link } from "react-router";
import { Avatar } from "@/components/Avatar";
import { Card, Label } from "@/components/ui";

// みんなの現在地 (mobile の src/components/PeoplePath.tsx に相当)。
// Roadmap Circle は Step ごと、Book Circle は「これから / 読書中 / 読了」の 3 段階に並べる。

type Progress = { stepIndex: number; percentage: number; completedSteps: number };

type Member = {
  role: "OWNER" | "MEMBER";
  user: { id: string; name: string; username: string; avatarUrl: string | null };
  progress: Progress | null;
};

type Target =
  | { type: "BOOK"; book: { title: string } }
  | { type: "ROADMAP"; roadmap: { steps: { id: string; position: number; book: { title: string } }[] } };

type Node = { key: string; label: string; caption: string };

function nodesOf(target: Target): Node[] {
  if (target.type === "ROADMAP") {
    return target.roadmap.steps.map((step) => ({
      key: step.id,
      label: String(step.position).padStart(2, "0"),
      caption: step.book.title,
    }));
  }
  return [
    { key: "todo", label: "01", caption: "これから" },
    { key: "reading", label: "02", caption: "読書中" },
    { key: "done", label: "03", caption: "読了" },
  ];
}

/** そのメンバーがどのノードにいるか。まだ始めていなければ null */
function nodeIndexOf(target: Target, progress: Progress | null): number | null {
  if (!progress) return null;
  if (target.type === "ROADMAP") return progress.stepIndex;
  if (progress.percentage >= 100) return 2;
  return progress.percentage > 0 ? 1 : 0;
}

function isFinished(target: Target, progress: Progress | null): boolean {
  if (!progress) return false;
  const total = target.type === "ROADMAP" ? target.roadmap.steps.length : 1;
  return total > 0 && progress.completedSteps >= total;
}

function statusText(target: Target, progress: Progress | null): string {
  if (!progress) return "まだ始めていません";
  if (isFinished(target, progress)) {
    return target.type === "ROADMAP" ? `${target.roadmap.steps.length}冊すべて読了` : "読み終えました";
  }
  if (target.type === "BOOK") return progress.percentage > 0 ? `読書中 · ${progress.percentage}%` : "これから読みます";
  return `${progress.stepIndex + 1}冊目${progress.percentage > 0 ? `を読書中 · ${progress.percentage}%` : "に進みました"}`;
}

export function PeoplePath({ target, members, joined }: { target: Target; members: Member[]; joined: boolean }) {
  const nodes = nodesOf(target);

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <Label>みんなの現在地</Label>
        <span className="text-xs text-muted">{target.type === "ROADMAP" ? "Book steps" : "Reading progress"}</span>
      </div>

      {!joined ? (
        <p className="text-sm text-muted">参加すると、メンバーがどこまで読んだかが見られます。</p>
      ) : nodes.length === 0 ? (
        <p className="text-sm text-muted">このロードマップにはまだ本が登録されていません。</p>
      ) : (
        <>
          {/* 本が多いときはこの中だけ横にスクロールする */}
          <div className="-mx-5 overflow-x-auto px-5 pb-1">
            <ol className="flex min-w-full" style={{ width: nodes.length > 5 ? `${nodes.length * 88}px` : undefined }}>
              {nodes.map((node, index) => {
                const here = members.filter((m) => nodeIndexOf(target, m.progress) === index);
                const last = index === nodes.length - 1;
                return (
                  <li key={node.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex h-8 items-end -space-x-2">
                      {here.slice(0, 3).map((m) => (
                        <span key={m.user.id} title={m.user.name}>
                          <Avatar name={m.user.name} url={m.user.avatarUrl} size={28} />
                        </span>
                      ))}
                      {here.length > 3 && (
                        <span className="inline-flex size-7 items-center justify-center rounded-full border-2 border-paper bg-accent text-[10px] text-white">
                          +{here.length - 3}
                        </span>
                      )}
                    </div>
                    <div className="flex w-full items-center">
                      <span className={`h-px flex-1 ${index ? "bg-accent/30" : "bg-transparent"}`} />
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${
                          here.length ? "border-accent bg-accent text-white" : "border-line bg-white text-muted"
                        }`}
                      >
                        {last && here.some((m) => isFinished(target, m.progress)) ? <Check size={14} /> : node.label}
                      </span>
                      <span className={`h-px flex-1 ${last ? "bg-transparent" : "bg-accent/30"}`} />
                    </div>
                    <span className="line-clamp-2 w-full px-1 text-center text-[11px] leading-tight text-muted">{node.caption}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <ul className="divide-y divide-line border-t border-line">
            {members.map((m) => (
              <li key={m.user.id}>
                <Link to={`/profile/${m.user.username}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                  <Avatar name={m.user.name} url={m.user.avatarUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {m.user.name}
                      {m.role === "OWNER" && <span className="ml-2 text-[10px] text-accent">オーナー</span>}
                    </p>
                    <p className={`text-xs ${m.progress ? "text-accent" : "text-muted"}`}>{statusText(target, m.progress)}</p>
                  </div>
                  {m.progress && !isFinished(target, m.progress) && (
                    <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-wash" aria-hidden>
                      <div className="h-full rounded-full bg-accent" style={{ width: `${m.progress.percentage}%` }} />
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
