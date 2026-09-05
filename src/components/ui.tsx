import type { ReactNode } from "react";

export const CARD =
  "rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

export const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300";

export const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900";

export function SectionTitle({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <header className="mb-5">
      <p className="text-xs font-semibold tracking-wide text-zinc-400">{step}</p>
      <h2 className="mt-1 text-xl font-bold text-zinc-900">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      ) : null}
    </header>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "danger";
  children: ReactNode;
}) {
  const toneClass = {
    info: "border-zinc-200 bg-zinc-50 text-zinc-600",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
  }[tone];

  return (
    <p className={`rounded-xl border px-4 py-3 text-sm leading-6 ${toneClass}`}>
      {children}
    </p>
  );
}
