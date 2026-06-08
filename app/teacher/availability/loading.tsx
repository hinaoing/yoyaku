import { CalendarLoading } from "@/components/loading-card";

export default function AvailabilityLoading() {
  return (
    <div className="space-y-6">
      <section className="animate-pulse">
        <div className="h-4 w-24 rounded bg-matcha/15" />
        <div className="mt-3 h-9 w-56 rounded bg-sumi/10" />
        <div className="mt-4 h-4 w-96 max-w-full rounded bg-sumi/10" />
      </section>
      <CalendarLoading />
    </div>
  );
}
