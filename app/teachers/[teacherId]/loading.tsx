import { CalendarWithSidebarLoading } from "@/components/loading-card";

export default function TeacherDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Profile banner */}
      <section className="animate-softPulse rounded-xl border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="size-14 shrink-0 rounded-full bg-matcha/10" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-28 rounded-full bg-matcha/15" />
            <div className="mt-2 h-7 w-40 rounded-md bg-sumi/[0.08]" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full max-w-xl rounded-full bg-sumi/[0.07]" />
              <div className="h-4 w-5/6 max-w-lg rounded-full bg-sumi/[0.07]" />
              <div className="h-4 w-2/3 max-w-md rounded-full bg-sumi/[0.07]" />
            </div>
            <div className="mt-3 h-8 w-64 max-w-full rounded-lg bg-matcha/[0.07]" />
          </div>
        </div>
      </section>

      {/* Calendar section */}
      <section className="space-y-4">
        <div className="animate-softPulse space-y-2">
          <div className="h-4 w-16 rounded-full bg-matcha/15" />
          <div className="h-8 w-56 rounded-md bg-sumi/[0.08]" />
        </div>
        <CalendarWithSidebarLoading sidebar="narrow" />
      </section>
    </div>
  );
}
