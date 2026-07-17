import { CalendarWithSidebarLoading, PageTitleLoading } from "@/components/loading-card";

export default function TeacherBookingsLoading() {
  return (
    <div className="space-y-6">
      <PageTitleLoading withDescription />
      <section className="rounded-xl border border-ink/10 bg-white p-5 shadow-soft">
        <CalendarWithSidebarLoading />
      </section>
    </div>
  );
}
