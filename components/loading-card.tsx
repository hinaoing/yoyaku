export function LoadingCard() {
  return (
    <div className="animate-softPulse rounded-xl border border-ink/10 bg-white p-5 shadow-soft">
      <div className="h-3 w-20 rounded-full bg-matcha/15" />
      <div className="mt-4 h-6 w-2/3 rounded-md bg-sumi/[0.08]" />
      <div className="mt-5 space-y-2.5">
        <div className="h-3.5 rounded-full bg-sumi/[0.07]" />
        <div className="h-3.5 w-5/6 rounded-full bg-sumi/[0.07]" />
        <div className="h-3.5 w-3/4 rounded-full bg-sumi/[0.07]" />
      </div>
    </div>
  );
}

export function CalendarLoading() {
  return (
    <div className="animate-softPulse space-y-4 rounded-xl border border-ink/10 bg-white p-5 shadow-soft">
      <div className="h-3 w-16 rounded-full bg-matcha/15" />
      <div className="h-7 w-40 rounded-md bg-sumi/[0.08]" />
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-ink/10 bg-ink/[0.06]">
        {Array.from({ length: 42 }, (_, index) => (
          <div className="min-h-24 bg-white p-3" key={index}>
            <div className="h-5 w-7 rounded-md bg-sumi/[0.08]" />
            <div className="mt-5 h-5 w-16 rounded-full bg-matcha/[0.08]" />
          </div>
        ))}
      </div>
    </div>
  );
}
