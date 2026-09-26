import { CalendarDays, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Card, ErrorMessage, Input, Label } from "@/components/ui";
import { useCircleActions } from "@/hooks/circle/useCircles";
import { localDateTimeToIso, meetingLabel, nextSchedule, periodLabel } from "@/lib/circle/format";

type Schedule = { id: string; title: string; scheduledAt: string; description: string | null };

/** 次の集まりと予定の一覧。オーナーは予定を追加・削除できる */
export function ScheduleSection({ circleId, schedules, isOwner, startDate, targetEndDate }: {
  circleId: string;
  schedules: Schedule[];
  isOwner: boolean;
  startDate: string | null;
  targetEndDate: string | null;
}) {
  const actions = useCircleActions(circleId);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const next = nextSchedule(schedules);
  const upcoming = schedules
    .filter((s) => new Date(s.scheduledAt).getTime() >= Date.now())
    .toSorted((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !when) return;
    actions.addSchedule.mutate(
      { title: title.trim(), scheduledAt: localDateTimeToIso(when) },
      { onSuccess: () => { setTitle(""); setWhen(""); } },
    );
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays size={20} className="text-accent" />
        <Label>Next meeting</Label>
      </div>
      <div>
        <p className="font-serif text-2xl">{meetingLabel(next?.scheduledAt)}</p>
        {next && <p className="mt-1 text-sm">{next.title}</p>}
        <p className="mt-2 text-xs text-muted">活動期間 · {periodLabel(startDate, targetEndDate)}</p>
      </div>

      {(upcoming.length > 1 || (isOwner && upcoming.length > 0)) && (
        <ul className="divide-y divide-line border-t border-line">
          {upcoming.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="text-muted">{meetingLabel(s.scheduledAt)}</span>
                <span className="ml-3 break-words">{s.title}</span>
              </span>
              {isOwner && <DeleteSchedule onDelete={() => actions.deleteSchedule.mutate(s.id)} />}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <form onSubmit={submit} className="space-y-3 border-t border-line pt-4">
          <p className="text-xs font-medium">予定を追加</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="scheduleTitle" placeholder="例: 第3章の読書会" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            <Input name="scheduleAt" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <Button type="submit" variant="secondary" loading={actions.addSchedule.isPending} disabled={!title.trim() || !when}>
            追加する
          </Button>
        </form>
      )}
      {(actions.addSchedule.error || actions.deleteSchedule.error) && (
        <ErrorMessage error={actions.addSchedule.error ?? actions.deleteSchedule.error} />
      )}
    </Card>
  );
}

function DeleteSchedule({ onDelete }: { onDelete: () => void }) {
  return (
    <button aria-label="この予定を削除" className="rounded-full p-1.5 text-muted hover:bg-wash hover:text-error" onClick={onDelete}>
      <Trash2 size={15} />
    </button>
  );
}
