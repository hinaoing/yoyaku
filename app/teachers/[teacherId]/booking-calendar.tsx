"use client";

import { CalendarPlus, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { isJapanHoliday } from "@/lib/japan-holidays";
import { buildMonthCalendarDates, formatDateJa, formatTimeJa, getWeekdayFromDateKey } from "@/lib/time";
import type { Slot, UserRole } from "@/lib/types";

type BookingCalendarProps = {
  dates: string[];
  nextMonthStart: string;
  slots: Slot[];
  teacherId: string;
  todayKey: string;
  viewerRole: UserRole | null;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function BookingCalendar({ dates, nextMonthStart, slots, teacherId, todayKey, viewerRole }: BookingCalendarProps) {
  const groupedSlots = useMemo(() => {
    const grouped = new Map<string, Slot[]>();

    for (const slot of slots) {
      const dateKey = formatIsoDateKey(slot.startsAt);
      grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), slot]);
    }

    return grouped;
  }, [slots]);
  const [selectedDate, setSelectedDate] = useState(
    () => dates.find((date) => (groupedSlots.get(date)?.length ?? 0) > 0) ?? dates.find((date) => date >= todayKey) ?? dates[0] ?? ""
  );

  const currentMonthDates = dates.filter((date) => date < nextMonthStart);
  const nextMonthDates = dates.filter((date) => date >= nextMonthStart);
  const selectedSlots = groupedSlots.get(selectedDate) ?? [];

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink/15 bg-white/60 px-6 py-10 text-center">
        <h2 className="text-lg font-semibold text-ink">予約できる時間がありません</h2>
        <p className="mt-2 text-sm text-sumi/70">講師の空き時間が追加されるまでお待ちください。</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <MonthSection
          dates={currentMonthDates}
          groupedSlots={groupedSlots}
          onSelect={setSelectedDate}
          selectedDate={selectedDate}
          title="今月"
          todayKey={todayKey}
        />
        <MonthSection
          dates={nextMonthDates}
          groupedSlots={groupedSlots}
          onSelect={setSelectedDate}
          selectedDate={selectedDate}
          title="来月"
          todayKey={todayKey}
        />
      </div>
      <aside className="rounded-xl border border-ink/10 bg-paper/60 p-4 shadow-soft xl:sticky xl:top-24 xl:self-start">
        <p className="text-sm font-medium text-matcha">選択中の日付</p>
        <h3 className="mt-1 text-xl font-semibold text-ink">{selectedDate ? formatDateJa(selectedDate) : "未選択"}</h3>
        <div className="mt-4 space-y-3">
          {selectedSlots.length > 0 ? (
            selectedSlots.map((slot) => (
              <div className="rounded-lg border border-ink/10 bg-white p-3 transition-all duration-150 hover:border-matcha/20 hover:shadow-sm" key={slot.startsAt}>
                <p className="font-medium text-ink">
                  {formatTimeJa(slot.startsAt)} - {formatTimeJa(slot.endsAt)}
                </p>
                {viewerRole === "student" ? (
                  <BookingButton startsAt={slot.startsAt} teacherId={teacherId} />
                ) : (
                  <p className="mt-3 rounded-md bg-sumi/[0.06] px-3 py-2 text-center text-sm text-sumi/65">
                    {viewerRole === "teacher" ? "学生アカウントで予約してください。" : "ログインすると予約できます。"}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="rounded-md bg-white p-3 text-sm text-sumi/65">この日は予約できる時間がありません。</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function BookingButton({ startsAt, teacherId }: { startsAt: string; teacherId: string }) {
  return (
    <form action={`/teachers/${teacherId}/book`} method="post">
      <input name="startsAt" type="hidden" value={startsAt} />
      <BookingSubmitButton />
    </form>
  );
}

function BookingSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-sumi active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-ink disabled:active:scale-100"
      disabled={pending}
    >
      {pending ? <Loader2 className="animate-spin" size={16} /> : <CalendarPlus size={16} />}
      {pending ? "予約中..." : "予約する"}
    </button>
  );
}

type MonthSectionProps = {
  dates: string[];
  groupedSlots: Map<string, Slot[]>;
  onSelect: (date: string) => void;
  selectedDate: string;
  title: string;
  todayKey: string;
};

function MonthSection({ dates, groupedSlots, onSelect, selectedDate, title, todayKey }: MonthSectionProps) {
  const cells = buildMonthCalendarDates(dates);
  const monthLabel = dates[0]
    ? new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long" }).format(new Date(`${dates[0]}T00:00:00+09:00`))
    : title;

  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-medium text-matcha">{title}</p>
        <h2 className="text-2xl font-semibold text-ink">{monthLabel}</h2>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-t-lg border border-ink/10 text-center text-sm font-medium text-sumi/60">
        {WEEKDAYS.map((weekday, index) => (
          <div className={["border-b border-r border-ink/[0.06] py-2.5", weekdayHeaderClass(index)].join(" ")} key={weekday}>
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-b-lg border border-t-0 border-ink/10">
        {cells.map((date, index) => {
          if (!date) {
            return <div className="min-h-28 border-b border-r border-ink/[0.06] bg-paper/40" key={`blank-${index}`} />;
          }

          const slotCount = groupedSlots.get(date)?.length ?? 0;
          const isPast = date < todayKey;
          const isToday = date === todayKey;
          const isSelected = date === selectedDate;
          const dayTone = getDayTone(date);

          return (
            <button
              className={[
                "min-h-28 border-b border-r border-ink/[0.06] p-3 text-left transition-all duration-150",
                isPast ? "bg-sumi/[0.06] text-sumi/40" : dayTone.cellClass,
                isSelected ? "ring-2 ring-inset ring-matcha" : ""
              ].join(" ")}
              disabled={isPast}
              key={date}
              onClick={() => onSelect(date)}
              type="button"
            >
              <span
                className={
                  isPast
                    ? "text-lg font-medium text-sumi/40"
                    : isToday
                      ? "text-lg font-semibold text-matcha"
                      : `text-lg font-medium ${dayTone.dateClass}`
                }
              >
                {date.slice(-2)}
              </span>
              <span className="mt-4 block text-sm text-sumi/65">
                {slotCount > 0 ? (
                  <span className="inline-flex rounded-full bg-matcha/10 px-2 py-1 text-xs font-medium text-matcha">
                    予約可能 {slotCount} 件
                  </span>
                ) : (
                  "空きなし"
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function getDayTone(date: string) {
  const weekday = getWeekdayFromDateKey(date);
  const holiday = isJapanHoliday(date);

  if (holiday || weekday === 0) {
    return { cellClass: "bg-sakura/5 hover:bg-sakura/10", dateClass: "text-sakura" };
  }

  if (weekday === 6) {
    return { cellClass: "bg-sky-50 hover:bg-sky-100", dateClass: "text-sky-700" };
  }

  return { cellClass: "bg-white hover:bg-paper", dateClass: "text-ink" };
}

function weekdayHeaderClass(index: number) {
  if (index === 0) {
    return "bg-sakura/5 text-sakura";
  }

  if (index === 6) {
    return "bg-sky-50 text-sky-700";
  }

  return "";
}

function formatIsoDateKey(iso: string) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(iso));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}
