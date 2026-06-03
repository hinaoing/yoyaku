import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children: ReactNode;
};

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-ink/20 bg-white/70 px-5 py-8 text-center">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-2 text-sm text-sumi/75">{children}</div>
    </div>
  );
}
