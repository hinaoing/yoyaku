"use client";

import { WEEKDAYS_JA } from "@/lib/constants";
import { isJapanHoliday } from "@/lib/japan-holidays";
import { getWeekdayFromDateKey } from "@/lib/time";

export function getDayTone(date: string) {
  const weekday = getWeekdayFromDateKey(date);

  if (isJapanHoliday(date) || weekday === 0) {
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

export function dayNumberClass(options: { isPast: boolean; isToday: boolean; dateClass: string }) {
  if (options.isPast) {
    return "text-base font-medium text-sumi/40 sm:text-lg";
  }

  if (options.isToday) {
    return "text-base font-semibold text-matcha sm:text-lg";
  }

  return `text-base font-medium sm:text-lg ${options.dateClass}`;
}

export function dayCellClass(options: { isPast: boolean; isSelected: boolean; cellClass: string }) {
  return [
    "min-h-[5.5rem] border-b border-r border-ink/[0.06] p-2 text-left transition-all duration-150 sm:min-h-28 sm:p-3",
    options.isPast ? "bg-sumi/[0.06] text-sumi/40" : options.cellClass,
    options.isSelected ? "ring-2 ring-inset ring-matcha" : ""
  ].join(" ");
}

export function WeekdayHeader() {
  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-t-lg border border-ink/10 text-center text-sm font-medium text-sumi/60">
      {WEEKDAYS_JA.map((weekday, index) => (
        <div className={["border-b border-r border-ink/[0.06] py-2.5", weekdayHeaderClass(index)].join(" ")} key={weekday}>
          {weekday}
        </div>
      ))}
    </div>
  );
}

export function BlankDayCell() {
  return <div className="min-h-[5.5rem] border-b border-r border-ink/[0.06] bg-paper/40 sm:min-h-28" />;
}

export function CountBadge({ count, unit }: { count: number; unit: string }) {
  if (count <= 0) {
    return <span className="text-[10px] text-sumi/55 sm:text-xs">—</span>;
  }

  return (
    <span className="inline-flex rounded-full bg-matcha/10 px-1.5 py-0.5 text-[10px] font-medium text-matcha sm:px-2 sm:py-1 sm:text-xs">
      {count}
      {unit}
    </span>
  );
}

export function MonthTabBar({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-1 rounded-xl bg-ink/[0.06] p-1">{children}</div>;
}

export function MonthTab({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={[
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
        active ? "bg-matcha text-white shadow-sm" : "text-sumi/65 hover:bg-white/70 hover:text-ink"
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
