import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children: ReactNode;
};

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="animate-fadeIn rounded-xl border border-dashed border-ink/15 bg-white/60 px-6 py-10 text-center">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-matcha/10">
        <Inbox size={22} className="text-matcha" />
      </div>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-sumi/70">{children}</div>
    </div>
  );
}
