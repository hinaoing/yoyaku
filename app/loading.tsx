import { CalendarLoading, LoadingCard } from "@/components/loading-card";

export default function Loading() {
  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.35fr)]">
      <LoadingCard />
      <CalendarLoading />
    </div>
  );
}
