import { LoadingCard } from "@/components/loading-card";

export default function StudentBookingsLoading() {
  return (
    <div className="space-y-5">
      <section className="animate-pulse">
        <div className="h-4 w-24 rounded bg-matcha/15" />
        <div className="mt-3 h-9 w-48 rounded bg-sumi/10" />
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </div>
    </div>
  );
}
