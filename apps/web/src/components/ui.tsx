import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { Link } from "react-router";
import { ApiError } from "@/api/client";

// 画面をまたいで使う小さな部品。見た目は mobile (apps/mobile/src/components/ui.tsx) に揃える。

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

/** 画面の外枠。幅を読みやすい長さに抑える */
export function Page({ title, eyebrow, actions, children }: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 md:px-6 md:pt-10 md:pb-16">
      {(title || eyebrow || actions) && (
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            {eyebrow && <Label>{eyebrow}</Label>}
            {title && <h1 className="mt-1 font-serif text-3xl leading-tight md:text-4xl">{title}</h1>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </main>
  );
}

/** 小さな英字の見出し (TODAY, EXPLORE など) */
export function Label({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase">{children}</p>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-line bg-white p-5", className)}>{children}</div>;
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent/90",
  secondary: "border border-line bg-white text-ink hover:bg-wash",
  ghost: "text-accent hover:bg-wash",
  danger: "border border-error/30 bg-white text-error hover:bg-error/5",
};
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant = "primary", loading, className, children, disabled, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button className={cx(buttonBase, variants[variant], className)} disabled={disabled || loading} {...props}>
      {loading && <Spinner small />}
      {children}
    </button>
  );
}

/** ボタンの見た目をしたリンク */
export function ButtonLink({ to, variant = "primary", className, children }: {
  to: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={cx(buttonBase, variants[variant], className)}>
      {children}
    </Link>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>(
  function Input({ label, error, className, id, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <label htmlFor={inputId} className="block">
        {label && <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>}
        <input
          ref={ref}
          id={inputId}
          className={cx(
            "w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15",
            error ? "border-error" : "border-line",
            className,
          )}
          {...props}
        />
        {error && <span className="mt-1 block text-xs text-error">{error}</span>}
      </label>
    );
  },
);

export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      role="status"
      aria-label="読み込み中"
      className={cx("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", small ? "size-4" : "size-6")}
    />
  );
}

/** 画面全体の読み込み中表示。Render の無料プランは起動に数十秒かかることがあるので一言添える */
export function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-accent">
      <Spinner />
      <p className="text-xs text-muted">読み込み中…（初回は少し時間がかかることがあります）</p>
    </div>
  );
}

export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError || error instanceof Error ? error.message : "問題が発生しました";
  return (
    <Card className="border-error/30 text-center">
      <p className="text-sm text-error">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          もう一度読み込む
        </Button>
      )}
    </Card>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="py-10 text-center">
      <p className="font-serif text-lg">{title}</p>
      {children && <div className="mt-3 text-sm text-muted">{children}</div>}
    </Card>
  );
}
