export function ProgressBar({ value, thin }: { value: number; thin?: boolean }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full overflow-hidden rounded-full bg-line ${thin ? "h-1" : "h-1.5"}`}
    >
      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${clamped}%` }} />
    </div>
  );
}
