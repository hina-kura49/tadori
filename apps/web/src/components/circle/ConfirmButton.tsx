import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui";

/** 押すと「本当に〜しますか？」をその場に出すボタン (window.confirm の代わり) */
export function ConfirmButton({ label, question, confirmLabel, onConfirm, loading, variant = "danger" }: {
  label: ReactNode;
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: "danger" | "secondary";
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return <Button variant={variant} className="w-full" onClick={() => setAsking(true)}>{label}</Button>;
  }
  return (
    <div className="rounded-2xl border border-error/30 bg-white p-4 text-center">
      <p className="text-sm">{question}</p>
      <div className="mt-3 flex justify-center gap-2">
        <Button variant="secondary" onClick={() => setAsking(false)} disabled={loading}>やめる</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </div>
  );
}
