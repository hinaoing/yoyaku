import { CalendarWithSidebarLoading, PageTitleLoading } from "@/components/loading-card";

export default function AvailabilityLoading() {
  return (
    <div className="space-y-6">
      <PageTitleLoading withDescription />
      <section className="rounded-xl border border-ink/10 bg-white p-5 shadow-soft">
        <CalendarWithSidebarLoading sidebar="wide" />
      </section>
    </div>
  );
}
