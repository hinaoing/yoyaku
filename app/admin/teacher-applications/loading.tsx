import { PageTitleLoading } from "@/components/loading-card";

function ApplicationCardLoading() {
  return (
    <article className="rounded-xl border border-ink/10 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-6 w-32 rounded-md bg-sumi/[0.08]" />
            <div className="h-6 w-16 rounded-full bg-matcha/10" />
          </div>
          <div className="mt-3 h-4 w-72 max-w-full rounded-full bg-sumi/[0.07]" />
        </div>
        <div className="h-4 w-32 rounded-full bg-sumi/[0.07]" />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="rounded-lg bg-paper/70 p-4" key={index}>
            <div className="h-4 w-24 rounded-full bg-sumi/[0.08]" />
            <div className="mt-3 space-y-2">
              <div className="h-3.5 rounded-full bg-sumi/[0.07]" />
              <div className="h-3.5 w-5/6 rounded-full bg-sumi/[0.07]" />
              <div className="h-3.5 w-2/3 rounded-full bg-sumi/[0.07]" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 border-t border-ink/10 pt-5 md:grid-cols-[auto_1fr]">
        <div className="h-10 w-28 rounded-lg bg-matcha/20" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="h-10 min-w-0 flex-1 rounded-lg border border-ink/10 bg-white" />
          <div className="h-10 w-28 rounded-lg border border-sakura/20 bg-white" />
        </div>
      </div>
    </article>
  );
}

export default function AdminTeacherApplicationsLoading() {
  return (
    <div className="animate-softPulse space-y-6">
      <PageTitleLoading withDescription />
      <section className="grid gap-4">
        <ApplicationCardLoading />
        <ApplicationCardLoading />
      </section>
    </div>
  );
}
