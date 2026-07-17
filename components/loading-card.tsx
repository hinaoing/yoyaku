export function TeacherCardLoading() {
  return (
    <div className="animate-softPulse rounded-xl border border-ink/10 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="size-11 shrink-0 rounded-full bg-matcha/10" />
          <div className="min-w-0 flex-1">
            <div className="h-5 w-32 rounded-md bg-sumi/[0.08]" />
            <div className="mt-3 space-y-2">
              <div className="h-3.5 rounded-full bg-sumi/[0.07]" />
              <div className="h-3.5 w-5/6 rounded-full bg-sumi/[0.07]" />
              <div className="h-3.5 w-2/3 rounded-full bg-sumi/[0.07]" />
            </div>
          </div>
        </div>
        <div className="size-9 shrink-0 rounded-lg bg-matcha/10" />
      </div>
    </div>
  );
}

export function PageTitleLoading({ withDescription = false }: { withDescription?: boolean }) {
  return (
    <section className="animate-softPulse space-y-3">
      <div className="h-4 w-24 rounded bg-matcha/15" />
      <div className="h-9 w-56 max-w-full rounded bg-sumi/10" />
      {withDescription ? <div className="h-4 w-96 max-w-full rounded bg-sumi/10" /> : null}
    </section>
  );
}

export function MonthTabsLoading() {
  return (
    <div className="flex gap-1 rounded-xl bg-ink/[0.06] p-1">
      <div className="flex h-[42px] flex-1 items-center justify-center rounded-lg bg-matcha/20">
        <div className="h-4 w-24 rounded-full bg-white/40" />
      </div>
      <div className="flex h-[42px] flex-1 items-center justify-center rounded-lg">
        <div className="h-4 w-24 rounded-full bg-sumi/[0.08]" />
      </div>
    </div>
  );
}

export function CalendarGridLoading() {
  return (
    <div className="min-w-0">
      <div className="grid grid-cols-7 overflow-hidden rounded-t-lg border border-ink/10">
        {Array.from({ length: 7 }, (_, index) => (
          <div className="grid place-items-center border-b border-r border-ink/[0.06] py-2.5" key={index}>
            <div className="h-4 w-4 rounded bg-sumi/[0.08]" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-b-lg border border-t-0 border-ink/10">
        {Array.from({ length: 35 }, (_, index) => (
          <div className="min-h-[5.5rem] border-b border-r border-ink/[0.06] bg-white p-2 sm:min-h-28 sm:p-3" key={index}>
            <div className="h-5 w-7 rounded-md bg-sumi/[0.08]" />
            <div className="mt-2 h-5 w-10 rounded-full bg-matcha/[0.08] sm:mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarSidebarLoading({ slotCount = 3 }: { slotCount?: number }) {
  return (
    <aside className="rounded-xl border border-ink/10 bg-paper/60 p-4 shadow-soft">
      <div className="h-4 w-24 rounded-full bg-matcha/15" />
      <div className="mt-2 h-6 w-32 rounded-md bg-sumi/[0.08]" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: slotCount }, (_, index) => (
          <div className="rounded-lg border border-ink/10 bg-white p-3" key={index}>
            <div className="h-4 w-28 rounded-full bg-sumi/[0.08]" />
            <div className="mt-3 h-9 rounded-lg bg-matcha/15" />
          </div>
        ))}
      </div>
    </aside>
  );
}

const sidebarGridClass = {
  narrow: "grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]",
  default: "grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]",
  wide: "grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"
} as const;

export function CalendarWithSidebarLoading({ sidebar = "default" }: { sidebar?: keyof typeof sidebarGridClass }) {
  return (
    <div className="animate-softPulse space-y-5">
      <MonthTabsLoading />
      <div className={sidebarGridClass[sidebar]}>
        <CalendarGridLoading />
        <CalendarSidebarLoading />
      </div>
    </div>
  );
}
