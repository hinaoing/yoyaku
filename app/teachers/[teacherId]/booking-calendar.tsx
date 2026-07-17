"use client";

import { CalendarPlus, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  BlankDayCell,
  CountBadge,
  MonthTab,
  MonthTabBar,
  WeekdayHeader,
  dayCellClass,
  dayNumberClass,
  getDayTone
} from "@/components/calendar-shared";
import {
  buildMonthCalendarDates,
  formatDateJa,
  formatMonthJa,
  formatTimeJa,
  isoToTokyoDateKey
} from "@/lib/time";
import type { Slot, UserRole } from "@/lib/types";

type BookingCalendarProps = {
  dates: string[];
  nextMonthStart: string;
  slots: Slot[];
  teacherId: string;
  todayKey: string;
  viewerRole: UserRole | null;
};

export function BookingCalendar({ dates, nextMonthStart, slots, teacherId, todayKey, viewerRole }: BookingCalendarProps) {
  const groupedSlots = useMemo(() => {
    const grouped = new Map<string, Slot[]>();

    for (const slot of slots) {
      const dateKey = isoToTokyoDateKey(slot.startsAt);
      const list = grouped.get(dateKey);
      if (list) {
        list.push(slot);
      } else {
        grouped.set(dateKey, [slot]);
      }
    }

    return grouped;
  }, [slots]);
  const currentMonthDates = dates.filter((date) => date < nextMonthStart);
  const nextMonthDates = dates.filter((date) => date >= nextMonthStart);
  const initialSelectedDate =
    dates.find((date) => (groupedSlots.get(date)?.length ?? 0) > 0) ?? dates.find((date) => date >= todayKey) ?? dates[0] ?? "";
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [activeTab, setActiveTab] = useState<"current" | "next">(initialSelectedDate >= nextMonthStart ? "next" : "current");

  const selectedSlots = groupedSlots.get(selectedDate) ?? [];

  const currentMonthLabel = formatMonthJa(currentMonthDates[0], "今月");
  const nextMonthLabel = formatMonthJa(nextMonthDates[0], "来月");

  const activeDates = activeTab === "current" ? currentMonthDates : nextMonthDates;
  const activeLabel = activeTab === "current" ? currentMonthLabel : nextMonthLabel;

  const currentMonthSlotCount = currentMonthDates.reduce((sum, d) => sum + (groupedSlots.get(d)?.length ?? 0), 0);
  const nextMonthSlotCount = nextMonthDates.reduce((sum, d) => sum + (groupedSlots.get(d)?.length ?? 0), 0);

  const selectMonth = (tab: "current" | "next") => {
    const monthDates = tab === "current" ? currentMonthDates : nextMonthDates;
    setActiveTab(tab);
    setSelectedDate(
      monthDates.find((date) => (groupedSlots.get(date)?.length ?? 0) > 0) ??
        monthDates.find((date) => date >= todayKey) ??
        monthDates[0] ??
        ""
    );
  };

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink/15 bg-white/60 px-6 py-10 text-center">
        <h2 className="text-lg font-semibold text-ink">予約できる時間がありません</h2>
        <p className="mt-2 text-sm text-sumi/70">講師の空き時間が追加されるまでお待ちください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Month tabs */}
      <MonthTabBar>
        <MonthTab active={activeTab === "current"} count={currentMonthSlotCount} label={currentMonthLabel} onClick={() => selectMonth("current")} />
        <MonthTab active={activeTab === "next"} count={nextMonthSlotCount} label={nextMonthLabel} onClick={() => selectMonth("next")} />
      </MonthTabBar>

      {/* Calendar + slot sidebar */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <MonthSection
          dates={activeDates}
          groupedSlots={groupedSlots}
          onSelect={setSelectedDate}
          selectedDate={selectedDate}
          title={activeLabel}
          todayKey={todayKey}
        />

        <aside className="rounded-xl border border-ink/10 bg-paper/60 p-4 shadow-soft lg:sticky lg:top-24 lg:self-start">
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
                    <BookingButton endsAt={slot.endsAt} startsAt={slot.startsAt} teacherId={teacherId} />
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
    </div>
  );
}

function BookingButton({ endsAt, startsAt, teacherId }: { endsAt: string; startsAt: string; teacherId: string }) {
  const lessonLabel = `${formatDateJa(isoToTokyoDateKey(startsAt))} ${formatTimeJa(startsAt)} - ${formatTimeJa(endsAt)}`;

  return (
    <form action={`/teachers/${teacherId}/book`} method="post">
      <input name="startsAt" type="hidden" value={startsAt} />
      <BookingConfirmButton lessonLabel={lessonLabel} />
    </form>
  );
}

function BookingConfirmButton({ lessonLabel }: { lessonLabel: string }) {
  const { pending } = useFormStatus();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setConfirming(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [confirming]);

  return (
    <>
      <button
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-matcha px-3 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-matcha/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-matcha/40 disabled:active:scale-100"
        disabled={pending}
        onClick={() => setConfirming(true)}
        type="button"
      >
        {pending ? <Loader2 className="animate-spin" size={16} /> : <CalendarPlus size={16} />}
        {pending ? "予約中..." : "予約する"}
      </button>
      {confirming ? (
        <div
          className="fixed inset-0 z-50 grid animate-fadeIn place-items-center bg-ink/35 px-4"
          onClick={() => {
            if (!pending) {
              setConfirming(false);
            }
          }}
        >
          <div
            aria-modal="true"
            className="w-full max-w-sm animate-slideUp rounded-xl border border-ink/10 bg-white p-5 shadow-soft"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <p className="text-sm font-medium text-matcha">予約確認</p>
            <h4 className="mt-2 text-lg font-semibold text-ink">この時間で予約しますか？</h4>
            <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-sm font-medium text-sumi">{lessonLabel}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-sumi transition-colors hover:bg-paper"
                onClick={() => setConfirming(false)}
                type="button"
              >
                戻る
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-matcha px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-matcha/90 disabled:cursor-not-allowed disabled:bg-matcha/40"
                disabled={pending}
                type="submit"
              >
                {pending ? <Loader2 className="animate-spin" size={15} /> : <CalendarPlus size={15} />}
                確定する
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
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

function MonthSection({ dates, groupedSlots, onSelect, selectedDate, todayKey }: MonthSectionProps) {
  const cells = buildMonthCalendarDates(dates);

  return (
    <section className="space-y-3">
      <WeekdayHeader />
      <div className="grid grid-cols-7 overflow-hidden rounded-b-lg border border-t-0 border-ink/10" style={{ marginTop: 0 }}>
        {cells.map((date, index) => {
          if (!date) {
            return <BlankDayCell key={`blank-${index}`} />;
          }

          const slotCount = groupedSlots.get(date)?.length ?? 0;
          const isPast = date < todayKey;
          const isToday = date === todayKey;
          const isSelected = date === selectedDate;
          const dayTone = getDayTone(date);

          return (
            <button
              aria-label={`${formatDateJa(date)} 空き${slotCount}枠`}
              aria-pressed={isSelected}
              className={dayCellClass({ cellClass: dayTone.cellClass, isPast, isSelected })}
              disabled={isPast}
              key={date}
              onClick={() => onSelect(date)}
              type="button"
            >
              <span className={dayNumberClass({ dateClass: dayTone.dateClass, isPast, isToday })}>{date.slice(-2)}</span>
              <span className="mt-2 block text-sumi/65 sm:mt-4">
                <CountBadge count={slotCount} unit="枠" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
