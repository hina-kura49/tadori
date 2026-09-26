import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { useUpdateStepProgress } from "@/hooks/me/useDashboard";

/** いま読んでいる本の進み具合を % で記録し、読み終えたら完了にする */
export function ProgressEditor({ userRoadmapId, stepId, percentage }: { userRoadmapId: string; stepId: string; percentage: number }) {
  const update = useUpdateStepProgress();
  const [value, setValue] = useState(percentage);
  const save = (next: number) =>
    update.mutate({
      userRoadmapId,
      stepId,
      json:
        next >= 100
          ? { status: "COMPLETED" }
          : { status: next > 0 ? "READING" : "NOT_STARTED", progressType: "PERCENTAGE", progressValue: String(next) },
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label="読んだ割合"
          className="flex-1 accent-accent"
        />
        <span className="w-12 text-right text-sm tabular-nums">{value}%</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button className="flex-1" loading={update.isPending && update.variables?.json.status !== "COMPLETED"} disabled={value === percentage} onClick={() => save(value)}>
          {percentage === 0 ? "読み始める" : "進捗を記録"}
        </Button>
        <Button variant="secondary" className="flex-1" loading={update.isPending && update.variables?.json.status === "COMPLETED"} onClick={() => save(100)}>
          <Check size={16} />
          読み終えた
        </Button>
      </div>
      {update.error && <p className="text-sm text-error">{update.error.message}</p>}
    </div>
  );
}
