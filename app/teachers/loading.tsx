import { LoadingCard } from "@/components/loading-card";

export default function TeachersLoading() {
  return (
    <div className="space-y-7">
      <section className="animate-pulse space-y-3">
        <div className="h-4 w-24 rounded bg-matcha/15" />
        <div className="h-9 w-80 max-w-full rounded bg-sumi/10" />
        <div className="h-4 w-96 max-w-full rounded bg-sumi/10" />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </section>
    </div>
  );
}
