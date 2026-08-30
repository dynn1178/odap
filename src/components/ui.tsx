"use client";

import type { ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  return (
    <Tag className={cx("rounded-2xl border border-line bg-surface p-4 sm:p-5", className)}>
      {children}
    </Tag>
  );
}

export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  suffix,
  tone = "ink",
}: {
  label: string;
  value: string | number;
  suffix?: string;
  tone?: "ink" | "correct" | "wrong" | "brand";
}) {
  const toneClass =
    tone === "correct"
      ? "text-correct"
      : tone === "wrong"
        ? "text-wrong"
        : tone === "brand"
          ? "text-brand"
          : "text-ink";
  return (
    <div className="rounded-xl bg-surface2 px-3 py-3 text-center">
      <div className="text-[0.72rem] text-muted">{label}</div>
      <div className={cx("mt-1 text-lg font-bold tabular-nums", toneClass)}>
        {value}
        {suffix && <span className="ml-0.5 text-xs font-medium">{suffix}</span>}
      </div>
    </div>
  );
}

const BTN_BASE =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const btn = {
  primary: cx(BTN_BASE, "bg-brand text-brand-fg hover:opacity-90"),
  ghost: cx(BTN_BASE, "border border-line bg-surface text-ink hover:bg-surface2"),
  subtle: cx(BTN_BASE, "bg-surface2 text-ink hover:opacity-90"),
};

export function Spinner({ label = "불러오는 중" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-wrong/40 bg-wrong/5 p-4 text-sm text-wrong">
      <p className="whitespace-pre-wrap break-words">{message}</p>
      {onRetry && (
        <button type="button" className={cx(btn.ghost, "mt-3")} onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}
