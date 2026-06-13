"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { APP_TIME_ZONE } from "@/lib/constants";
import { isJapanHoliday } from "@/lib/japan-holidays";
import { buildMonthCalendarDates, formatDateJa, formatTimeJa, getWeekdayFromDateKey } from "@/lib/time";

type StudentProfile = {
  email: string | null;
  full_name: string | null;
};

export type TeacherBookingCalendarItem = {
  ends_at: string;
  id: string;
  profiles: StudentProfile | StudentProfile[] | null;
  starts_at: string;
  status: string;
};

type TeacherBookingsCalendarProps = {
  bookings: TeacherBookingCalendarItem[];
  dates: string[];
  nextMonthStart: string;
  todayKey: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function TeacherBookingsCalendar({ bookings, dates, nextMonthStart, todayKey }: TeacherBookingsCalendarProps) {
  const groupedBookings = useMemo(() => {
    const grouped = new Map<string, TeacherBookingCalendarItem[]>();

    for (const booking of bookings) {
      const dateKey = formatIsoDateKey(booking.starts_at);
      grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), booking]);
    }

    return grouped;
  }, [bookings]);
  const currentMonthDates = dates.filter((date) => date < nextMonthStart);
  const nextMonthDates = dates.filter((date) => date >= nextMonthStart);
  const initialSelectedDate = dates.find((date) => (groupedBookings.get(date)?.length ?? 0) > 0) ?? dates.find((date) => date >= todayKey) ?? dates[0] ?? "";
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [activeTab, setActiveTab] = useState<"current" | "next">(initialSelectedDate >= nextMonthStart ? "next" : "current");
  const activeDates = activeTab === "current" ? currentMonthDates : nextMonthDates;
  const selectedBookings = groupedBookings.get(selectedDate) ?? [];
  const currentMonthCount = currentMonthDates.reduce((sum, date) => sum + (groupedBookings.get(date)?.length ?? 0), 0);
  const nextMonthCount = nextMonthDates.reduce((sum, date) => sum + (groupedBookings.get(date)?.length ?? 0), 0);
  const selectMonth = (tab: "current" | "next") => {
    const monthDates = tab === "current" ? currentMonthDates : nextMonthDates;
    setActiveTab(tab);
    setSelectedDate(monthDates.find((date) => (groupedBookings.get(date)?.length ?? 0) > 0) ?? monthDates.find((date) => date >= todayKey) ?? monthDates[0] ?? "");
  };

  return (
    <section className="space-y-5 rounded-xl border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex gap-1 rounded-xl border border-ink/10 bg-paper/70 p-1 shadow-inner">
        <MonthTab active={activeTab === "current"} count={currentMonthCount} label={monthLabel(currentMonthDates[0], "今月")} onClick={() => selectMonth("current")} />
        <MonthTab active={activeTab === "next"} count={nextMonthCount} label={monthLabel(nextMonthDates[0], "来月")} onClick={() => selectMonth("next")} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <MonthGrid dates={activeDates} groupedBookings={groupedBookings} onSelect={setSelectedDate} selectedDate={selectedDate} todayKey={todayKey} />

        <aside className="rounded-xl border border-ink/10 bg-paper/60 p-4 shadow-soft lg:sticky lg:top-24 lg:self-start">
          <p className="text-sm font-medium text-matcha">選択中の日付</p>
          <h3 className="mt-1 text-xl font-semibold text-ink">{selectedDate ? formatDateJa(selectedDate) : "未選択"}</h3>
          <div className="mt-4 space-y-3">
            {selectedBookings.length > 0 ? (
              selectedBookings.map((booking) => {
                const student = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
                return (
                  <Link
                    className="group block rounded-lg border border-ink/10 bg-white p-3 transition-all duration-150 hover:border-matcha/25 hover:shadow-sm"
                    href={`/teacher/bookings/${booking.id}`}
                    key={booking.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">
                          {formatTimeJa(booking.starts_at)} - {formatTimeJa(booking.ends_at)}
                        </p>
                        <p className="mt-1 text-sm text-sumi/70">{student?.full_name || student?.email || "生徒"}</p>
                      </div>
                      <ChevronRight className="mt-0.5 text-matcha transition-transform group-hover:translate-x-0.5" size={17} />
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="rounded-md bg-white p-3 text-sm text-sumi/65">この日の予約はありません。</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function MonthTab({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return (
    <button
      className={[
        "flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
        active
          ? "border-matcha bg-matcha text-white shadow-sm"
          : "border-ink/10 bg-white/75 text-sumi/70 hover:border-matcha/30 hover:bg-matcha/[0.06] hover:text-ink"
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {label}
      {count > 0 ? (
        <span className={["rounded-full px-2 py-0.5 text-xs font-semibold", active ? "bg-white/20 text-white" : "bg-matcha/10 text-matcha"].join(" ")}>
          {count}件
        </span>
      ) : null}
    </button>
  );
}

function MonthGrid({
  dates,
  groupedBookings,
  onSelect,
  selectedDate,
  todayKey
}: {
  dates: string[];
  groupedBookings: Map<string, TeacherBookingCalendarItem[]>;
  onSelect: (date: string) => void;
  selectedDate: string;
  todayKey: string;
}) {
  const cells = buildMonthCalendarDates(dates);

  return (
    <section className="min-w-0">
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
            return <div className="min-h-[5.5rem] border-b border-r border-ink/[0.06] bg-paper/40 sm:min-h-28" key={`blank-${index}`} />;
          }

          const count = groupedBookings.get(date)?.length ?? 0;
          const isPast = date < todayKey;
          const isSelected = date === selectedDate;
          const isToday = date === todayKey;
          const dayTone = getDayTone(date);

          return (
            <button
              className={[
                "min-h-[5.5rem] border-b border-r border-ink/[0.06] p-2 text-left transition-all duration-150 sm:min-h-28 sm:p-3",
                isPast ? "bg-sumi/[0.06] text-sumi/40" : dayTone.cellClass,
                isSelected ? "ring-2 ring-inset ring-matcha" : ""
              ].join(" ")}
              key={date}
              onClick={() => onSelect(date)}
              type="button"
            >
              <span
                className={
                  isPast
                    ? "text-base font-medium text-sumi/40 sm:text-lg"
                    : isToday
                      ? "text-base font-semibold text-matcha sm:text-lg"
                      : `text-base font-medium sm:text-lg ${dayTone.dateClass}`
                }
              >
                {date.slice(-2)}
              </span>
              <span className="mt-2 block sm:mt-4">
                {count > 0 ? (
                  <span className="inline-flex rounded-full bg-matcha/10 px-1.5 py-0.5 text-[10px] font-medium text-matcha sm:px-2 sm:py-1 sm:text-xs">
                    {count}件
                  </span>
                ) : (
                  <span className="text-[10px] text-sumi/55 sm:text-xs">-</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function monthLabel(date: string | undefined, fallback: string) {
  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", timeZone: APP_TIME_ZONE }).format(new Date(`${date}T00:00:00+09:00`));
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
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(iso));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}
