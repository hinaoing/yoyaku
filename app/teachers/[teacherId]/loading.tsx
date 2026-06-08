import { CalendarLoading, LoadingCard } from "@/components/loading-card";

export default function TeacherDetailLoading() {
  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.35fr)]">
      <LoadingCard />
      <CalendarLoading />
    </div>
  );
}
