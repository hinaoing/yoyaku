"use client";

import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import {
  BlankDayCell,
  CountBadge,
  MonthTab,
  WeekdayHeader,
  dayCellClass,
  dayNumberClass,
  getDayTone
} from "@/components/calendar-shared";
import { buildMonthCalendarDates, formatDateJa, formatMonthJa, formatTimeJa, isoToTokyoDateKey } from "@/lib/time";

type TeacherSummary = {
  display_name: string | null;
  meeting_url: string | null;
};

export type StudentBookingCalendarItem = {
  ends_at: string;
  id: string;
  starts_at: string;
  status: string;
  teachers: TeacherSummary | TeacherSummary[] | null;
};

type StudentBookingsCalendarProps = {
  bookings: StudentBookingCalendarItem[];
  dates: string[];
  nextMonthStart: string;
  todayKey: string;
};

export function StudentBookingsCalendar({ bookings, dates, nextMonthStart, todayKey }: StudentBookingsCalendarProps) {
  const groupedBookings = useMemo(() => {
    const grouped = new Map<string, StudentBookingCalendarItem[]>();

    for (const booking of bookings) {
      const dateKey = isoToTokyoDateKey(booking.starts_at);
      const list = grouped.get(dateKey);
      if (list) {
        list.push(booking);
      } else {
        grouped.set(dateKey, [booking]);
      }
    }

    return grouped;
  }, [bookings]);
  const currentMonthDates = dates.filter((date) => date < nextMonthStart);
  const nextMonthDates = dates.filter((date) => date >= nextMonthStart);
  const initialSelectedDate =
    dates.find((date) => date >= todayKey && (groupedBookings.get(date)?.length ?? 0) > 0) ??
    dates.find((date) => (groupedBookings.get(date)?.length ?? 0) > 0) ??
    dates.find((date) => date >= todayKey) ??
    dates[0] ??
    "";
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [activeTab, setActiveTab] = useState<"current" | "next">(initialSelectedDate >= nextMonthStart ? "next" : "current");
  const activeDates = activeTab === "current" ? currentMonthDates : nextMonthDates;
  const selectedBookings = groupedBookings.get(selectedDate) ?? [];
  const currentMonthCount = currentMonthDates.reduce((sum, date) => sum + (groupedBookings.get(date)?.length ?? 0), 0);
  const nextMonthCount = nextMonthDates.reduce((sum, date) => sum + (groupedBookings.get(date)?.length ?? 0), 0);
  const selectMonth = (tab: "current" | "next") => {
    const monthDates = tab === "current" ? currentMonthDates : nextMonthDates;
    setActiveTab(tab);
    setSelectedDate(
      monthDates.find((date) => date >= todayKey && (groupedBookings.get(date)?.length ?? 0) > 0) ??
        monthDates.find((date) => (groupedBookings.get(date)?.length ?? 0) > 0) ??
        monthDates.find((date) => date >= todayKey) ??
        monthDates[0] ??
        ""
    );
  };

  return (
    <section className="space-y-5 rounded-xl border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex gap-1 rounded-xl border border-ink/10 bg-paper/70 p-1 shadow-inner">
        <MonthTab active={activeTab === "current"} count={currentMonthCount} label={formatMonthJa(currentMonthDates[0], "今月")} onClick={() => selectMonth("current")} />
        <MonthTab active={activeTab === "next"} count={nextMonthCount} label={formatMonthJa(nextMonthDates[0], "来月")} onClick={() => selectMonth("next")} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <MonthGrid dates={activeDates} groupedBookings={groupedBookings} onSelect={setSelectedDate} selectedDate={selectedDate} todayKey={todayKey} />

        <aside className="rounded-xl border border-ink/10 bg-paper/60 p-4 shadow-soft lg:sticky lg:top-24 lg:self-start">
          <p className="text-sm font-medium text-matcha">選択中の日付</p>
          <h3 className="mt-1 text-xl font-semibold text-ink">{selectedDate ? formatDateJa(selectedDate) : "未選択"}</h3>
          <div className="mt-4 space-y-3">
            {selectedBookings.length > 0 ? (
              selectedBookings.map((booking) => {
                const teacher = Array.isArray(booking.teachers) ? booking.teachers[0] : booking.teachers;
                return (
                  <article className="rounded-lg border border-ink/10 bg-white p-3" key={booking.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">
                          {formatTimeJa(booking.starts_at)} - {formatTimeJa(booking.ends_at)}
                        </p>
                        <p className="mt-1 text-sm text-sumi/70">{teacher?.display_name ?? "講師"}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {teacher?.meeting_url ? (
                        <a
                          className="inline-flex items-center gap-1.5 rounded-md border border-matcha/20 bg-matcha/[0.06] px-2.5 py-1.5 text-xs font-medium text-matcha transition-colors hover:bg-matcha/10"
                          href={teacher.meeting_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink size={13} />
                          レッスンURL
                        </a>
                      ) : null}
                      <Link
                        className="inline-flex items-center gap-1.5 rounded-md border border-ink/15 bg-white px-2.5 py-1.5 text-xs font-medium text-sumi transition-colors hover:bg-paper"
                        href={`/student/bookings/${booking.id}`}
                      >
                        詳細
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  </article>
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

function MonthGrid({
  dates,
  groupedBookings,
  onSelect,
  selectedDate,
  todayKey
}: {
  dates: string[];
  groupedBookings: Map<string, StudentBookingCalendarItem[]>;
  onSelect: (date: string) => void;
  selectedDate: string;
  todayKey: string;
}) {
  const cells = buildMonthCalendarDates(dates);

  return (
    <section className="min-w-0">
      <WeekdayHeader />
      <div className="grid grid-cols-7 overflow-hidden rounded-b-lg border border-t-0 border-ink/10">
        {cells.map((date, index) => {
          if (!date) {
            return <BlankDayCell key={`blank-${index}`} />;
          }

          const count = groupedBookings.get(date)?.length ?? 0;
          const isPast = date < todayKey;
          const isSelected = date === selectedDate;
          const isToday = date === todayKey;
          const dayTone = getDayTone(date);

          return (
            <button
              aria-label={`${formatDateJa(date)} 予約${count}件`}
              aria-pressed={isSelected}
              className={dayCellClass({ cellClass: dayTone.cellClass, isPast, isSelected })}
              key={date}
              onClick={() => onSelect(date)}
              type="button"
            >
              <span className={dayNumberClass({ dateClass: dayTone.dateClass, isPast, isToday })}>{date.slice(-2)}</span>
              <span className="mt-2 block sm:mt-4">
                <CountBadge count={count} unit="件" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
