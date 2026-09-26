import type { ReactNode } from "react";

/** 選択肢のボタン (mobile の Chip に相当) */
export function Choice({ selected, onClick, children, note }: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
        selected ? "border-accent bg-wash text-accent" : "border-line bg-white hover:border-accent/40"
      }`}
    >
      <span className="block font-medium">{children}</span>
      {note && <span className="mt-0.5 block text-xs text-muted">{note}</span>}
    </button>
  );
}
