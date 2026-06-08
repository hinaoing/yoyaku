export function LoadingCard() {
  return (
    <div className="animate-pulse rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
      <div className="h-4 w-24 rounded bg-sumi/10" />
      <div className="mt-4 h-8 w-2/3 rounded bg-sumi/10" />
      <div className="mt-4 space-y-2">
        <div className="h-4 rounded bg-sumi/10" />
        <div className="h-4 w-5/6 rounded bg-sumi/10" />
      </div>
    </div>
  );
}

export function CalendarLoading() {
  return (
    <div className="animate-pulse space-y-4 rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="h-4 w-20 rounded bg-matcha/15" />
      <div className="h-8 w-44 rounded bg-sumi/10" />
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-ink/10 bg-ink/10">
        {Array.from({ length: 42 }, (_, index) => (
          <div className="min-h-24 bg-white p-3" key={index}>
            <div className="h-5 w-8 rounded bg-sumi/10" />
            <div className="mt-5 h-6 w-20 rounded bg-matcha/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
