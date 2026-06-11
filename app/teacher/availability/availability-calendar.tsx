"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { availabilityIssueMessages, validateAvailabilitySlots } from "@/lib/availability-validation";
import { APP_TIME_ZONE, BOOKING_START_INTERVAL_MINUTES, LESSON_DURATION_MINUTES } from "@/lib/constants";
import { isJapanHoliday } from "@/lib/japan-holidays";
import { buildMonthCalendarDates, formatDateJa, getWeekdayFromDateKey, parseTimeToMinutes, toTimeValue } from "@/lib/time";
import type { DateAvailability } from "@/lib/types";

type Row = {
  key: string;
  availability_date: string;
  start_time: string;
  end_time: string;
};

type AvailabilityCalendarProps = {
  dates: string[];
  initialSlots: DateAvailability[];
  nextMonthStart: string;
  rangeStart: string;
  rangeEnd: string;
  todayKey: string;
  currentTime: string;
  defaultStartTime: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const TIME_HOURS = Array.from({ length: 24 }, (_, hour) => hour.toString().padStart(2, "0"));
const TIME_MINUTES = ["00", "30"] as const;

export function AvailabilityCalendar({
  dates,
  initialSlots,
  nextMonthStart,
  rangeStart,
  rangeEnd,
  todayKey,
  currentTime,
  defaultStartTime
}: AvailabilityCalendarProps) {
  const [rows, setRows] = useState<Row[]>(
    initialSlots.map((slot) => ({
      key: slot.id ?? `${slot.availability_date}-${slot.start_time}-${slot.end_time}`,
      availability_date: slot.availability_date,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5)
    }))
  );
  const [selectedDate, setSelectedDate] = useState(() => dates.find((date) => date >= todayKey) ?? dates[0] ?? "");
  const [activeTab, setActiveTab] = useState<"current" | "next">("current");

  const groupedRows = useMemo(() => {
    const grouped = new Map<string, Row[]>();

    for (const row of rows) {
      grouped.set(row.availability_date, [...(grouped.get(row.availability_date) ?? []), row]);
    }

    return grouped;
  }, [rows]);

  const editableRows = useMemo(
    () => rows.filter((row) => isEditableSlot(row, todayKey, currentTime)),
    [currentTime, rows, todayKey]
  );
  const validationIssues = useMemo(
    () => validateAvailabilitySlots(editableRows, { endDate: rangeEnd, startDate: rangeStart }),
    [editableRows, rangeEnd, rangeStart]
  );
  const invalidRowKeys = useMemo(
    () => new Set(validationIssues.map((issue) => issue.key).filter(Boolean)),
    [validationIssues]
  );
  const issueMessages = availabilityIssueMessages(validationIssues);

  function addRow(date: string) {
    if (!date) {
      return;
    }

    setSelectedDate(date);
    setRows((current) => {
      const startTime = getNextStartTimeForDate(current, date, todayKey, defaultStartTime);
      const endTime = addMinutesToTime(startTime, LESSON_DURATION_MINUTES);

      if (current.some((row) => row.availability_date === date && row.start_time === startTime)) {
        return current;
      }

      return [
        ...current,
        {
          key: `${date}-${crypto.randomUUID()}`,
          availability_date: date,
          start_time: startTime,
          end_time: endTime
        }
      ];
    });
  }

  function updateRow(key: string, field: "start_time" | "end_time", value: string) {
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) {
          return row;
        }

        if (field === "start_time") {
          return { ...row, start_time: value, end_time: addMinutesToTime(value, LESSON_DURATION_MINUTES) };
        }

        return { ...row, [field]: value };
      })
    );
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  const currentMonthDates = dates.filter((date) => date < nextMonthStart);
  const nextMonthDates = dates.filter((date) => date >= nextMonthStart);
  const selectedRows = groupedRows.get(selectedDate) ?? [];

  const currentMonthLabel = currentMonthDates[0]
    ? new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", timeZone: APP_TIME_ZONE }).format(new Date(`${currentMonthDates[0]}T00:00:00+09:00`))
    : "今月";
  const nextMonthLabel = nextMonthDates[0]
    ? new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", timeZone: APP_TIME_ZONE }).format(new Date(`${nextMonthDates[0]}T00:00:00+09:00`))
    : "来月";

  const activeDates = activeTab === "current" ? currentMonthDates : nextMonthDates;

  // Count configured slots per month for tab badges
  const currentMonthSlotCount = currentMonthDates.reduce((sum, d) => sum + (groupedRows.get(d)?.length ?? 0), 0);
  const nextMonthSlotCount = nextMonthDates.reduce((sum, d) => sum + (groupedRows.get(d)?.length ?? 0), 0);

  return (
    <form action="/teacher/availability/save" className="space-y-5 rounded-xl border border-ink/10 bg-white p-5 shadow-soft" method="post">
      <input name="rangeStart" type="hidden" value={rangeStart} />
      <input name="rangeEnd" type="hidden" value={rangeEnd} />
      {editableRows.map((row) => (
        <div key={`hidden-${row.key}`}>
          <input name="slotDate" type="hidden" value={row.availability_date} />
          <input name="slotStart" type="hidden" value={row.start_time} />
          <input name="slotEnd" type="hidden" value={row.end_time} />
        </div>
      ))}

      {/* Month tabs */}
      <div className="flex gap-1 rounded-xl border border-ink/10 bg-paper/70 p-1 shadow-inner">
        <button
          className={[
            "flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            activeTab === "current"
              ? "border-matcha bg-matcha text-white shadow-sm"
              : "border-ink/10 bg-white/75 text-sumi/70 hover:border-matcha/30 hover:bg-matcha/[0.06] hover:text-ink"
          ].join(" ")}
          onClick={() => setActiveTab("current")}
          type="button"
        >
          {currentMonthLabel}
          {currentMonthSlotCount > 0 && (
            <span
              className={[
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                activeTab === "current" ? "bg-white/20 text-white" : "bg-matcha/10 text-matcha"
              ].join(" ")}
            >
              {currentMonthSlotCount}件
            </span>
          )}
        </button>
        <button
          className={[
            "flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            activeTab === "next"
              ? "border-matcha bg-matcha text-white shadow-sm"
              : "border-ink/10 bg-white/75 text-sumi/70 hover:border-matcha/30 hover:bg-matcha/[0.06] hover:text-ink"
          ].join(" ")}
          onClick={() => setActiveTab("next")}
          type="button"
        >
          {nextMonthLabel}
          {nextMonthSlotCount > 0 && (
            <span
              className={[
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                activeTab === "next" ? "bg-white/20 text-white" : "bg-matcha/10 text-matcha"
              ].join(" ")}
            >
              {nextMonthSlotCount}件
            </span>
          )}
        </button>
      </div>

      {/* Calendar + Day editor sidebar */}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <MonthSection
          currentTime={currentTime}
          dates={activeDates}
          groupedRows={groupedRows}
          onAdd={addRow}
          onSelect={setSelectedDate}
          selectedDate={selectedDate}
          todayKey={todayKey}
        />
        <DayEditor
          currentTime={currentTime}
          defaultStartTime={defaultStartTime}
          invalidRowKeys={invalidRowKeys}
          issueMessages={issueMessages}
          onAdd={addRow}
          onRemove={removeRow}
          onUpdate={updateRow}
          rows={selectedRows}
          selectedDate={selectedDate}
          todayKey={todayKey}
        />
      </div>
      <SaveButton hasValidationIssues={validationIssues.length > 0} />
    </form>
  );
}

function SaveButton({ hasValidationIssues }: { hasValidationIssues: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 font-medium text-white transition-all duration-200 hover:bg-sumi active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-sumi/35 disabled:active:scale-100"
      disabled={hasValidationIssues || pending}
    >
      {pending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
      {pending ? "保存中..." : "保存する"}
    </button>
  );
}

type MonthSectionProps = {
  currentTime: string;
  dates: string[];
  groupedRows: Map<string, Row[]>;
  onAdd: (date: string) => void;
  onSelect: (date: string) => void;
  selectedDate: string;
  todayKey: string;
};

function MonthSection({
  currentTime,
  dates,
  groupedRows,
  onAdd,
  onSelect,
  selectedDate,
  todayKey
}: MonthSectionProps) {
  const cells = buildMonthCalendarDates(dates);

  return (
    <section className="min-w-0 space-y-0">
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

          const rows = groupedRows.get(date) ?? [];
          const isPast = date < todayKey;
          const isToday = date === todayKey;
          const canAdd = date > todayKey || (isToday && currentTime < "23:30");
          const isSelected = date === selectedDate;
          const dayTone = getDayTone(date);

          return (
            <div
              className={[
                "min-h-[5.5rem] border-b border-r border-ink/[0.06] p-2 text-left transition-all duration-150 sm:min-h-28 sm:p-3",
                isPast ? "bg-sumi/[0.06] text-sumi/40" : `${dayTone.cellClass} cursor-pointer`,
                isSelected ? "ring-2 ring-inset ring-matcha" : ""
              ].join(" ")}
              key={date}
              onClick={() => {
                if (!isPast) {
                  onSelect(date);
                }
              }}
            >
              <div className="flex items-start justify-between gap-1">
                <button
                  className="min-w-0 flex-1 text-left"
                  disabled={isPast}
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
                </button>
                {canAdd ? (
                  <button
                    aria-label={`${formatDateJa(date)}に時間を追加`}
                    className="grid size-7 shrink-0 place-items-center rounded-md border border-ink/15 bg-white/80 text-ink transition-all duration-150 hover:border-matcha/30 hover:bg-matcha/10 hover:text-matcha sm:size-8 sm:rounded-lg"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAdd(date);
                    }}
                    type="button"
                  >
                    <Plus size={14} />
                  </button>
                ) : null}
              </div>
              <button
                className="mt-2 w-full text-left text-sumi/65 disabled:text-sumi/40 sm:mt-4"
                disabled={isPast}
                onClick={() => onSelect(date)}
                type="button"
              >
                {rows.length > 0 ? (
                  <span
                    className={
                      isPast
                        ? "inline-flex rounded-full bg-sumi/10 px-1.5 py-0.5 text-[10px] font-medium text-sumi/45 sm:px-2 sm:py-1 sm:text-xs"
                        : "inline-flex rounded-full bg-matcha/10 px-1.5 py-0.5 text-[10px] font-medium text-matcha sm:px-2 sm:py-1 sm:text-xs"
                    }
                  >
                    {rows.length}件
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs">—</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type DayEditorProps = {
  currentTime: string;
  defaultStartTime: string;
  invalidRowKeys: Set<string | undefined>;
  issueMessages: string[];
  onAdd: (date: string) => void;
  onRemove: (key: string) => void;
  onUpdate: (key: string, field: "start_time" | "end_time", value: string) => void;
  rows: Row[];
  selectedDate: string;
  todayKey: string;
};

function DayEditor({
  currentTime,
  defaultStartTime,
  invalidRowKeys,
  issueMessages,
  onAdd,
  onRemove,
  onUpdate,
  rows,
  selectedDate,
  todayKey
}: DayEditorProps) {
  const isPast = selectedDate < todayKey;
  const canAdd = selectedDate > todayKey || (selectedDate === todayKey && currentTime < "23:30");

  return (
    <aside className="rounded-xl border border-ink/10 bg-paper/60 p-4 shadow-soft lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-matcha">選択中の日付</p>
          <h3 className="text-xl font-semibold text-ink">{selectedDate ? formatDateJa(selectedDate) : "未選択"}</h3>
        </div>
        {canAdd ? (
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition-all duration-150 hover:border-matcha/30 hover:bg-matcha/[0.06] hover:text-matcha"
            onClick={() => onAdd(selectedDate)}
            type="button"
          >
            <Plus size={16} />
            追加
          </button>
        ) : null}
      </div>

      {issueMessages.length > 0 ? (
        <div className="mt-4 space-y-1 rounded-lg border border-sakura/25 bg-sakura/[0.06] p-3 text-sm text-sakura">
          {issueMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {isPast ? <p className="rounded-md bg-white p-3 text-sm text-sumi/65">過去の日付は編集できません。</p> : null}
        {rows.length === 0 && !isPast ? (
          <p className="rounded-md bg-white p-3 text-sm text-sumi/65">右上の追加ボタンから時間を設定できます。</p>
        ) : null}
        {rows.map((row) => (
          <SlotEditor
            currentTime={currentTime}
            defaultStartTime={defaultStartTime}
            invalid={invalidRowKeys.has(row.key)}
            key={row.key}
            onRemove={onRemove}
            onUpdate={onUpdate}
            row={row}
            todayKey={todayKey}
          />
        ))}
      </div>
    </aside>
  );
}

type SlotEditorProps = {
  currentTime: string;
  defaultStartTime: string;
  invalid: boolean;
  onRemove: (key: string) => void;
  onUpdate: (key: string, field: "start_time" | "end_time", value: string) => void;
  row: Row;
  todayKey: string;
};

function SlotEditor({ currentTime, defaultStartTime, invalid, onRemove, onUpdate, row, todayKey }: SlotEditorProps) {
  const editable = isEditableSlot(row, todayKey, currentTime);
  const minTime = row.availability_date === todayKey ? defaultStartTime : undefined;

  if (!editable) {
    return (
      <div className="rounded-md bg-sumi/[0.06] px-3 py-2 text-sm text-sumi/45">
        {row.start_time}-{row.end_time}
      </div>
    );
  }

  return (
    <div className={invalid ? "rounded-lg border border-sakura/30 bg-sakura/[0.04] p-3" : "rounded-lg border border-ink/10 bg-white p-3"}>
      <div className="grid grid-cols-[minmax(0,1fr)_5rem_2.375rem] items-end gap-3">
        <label className="grid min-w-0 gap-1 text-xs text-sumi">
          開始
          <TimeSelect
            min={minTime}
            onChange={(value) => onUpdate(row.key, "start_time", value)}
            value={row.start_time}
          />
        </label>
        <div className="grid gap-1 text-xs text-sumi">
          終了
          <div className="flex h-[38px] items-center justify-center rounded-lg border border-ink/10 bg-paper/70 px-2 text-center text-sm font-medium text-sumi/70">
            {row.end_time}
          </div>
        </div>
        <button
          aria-label="削除"
          className="grid h-[38px] w-[38px] place-items-center rounded-lg border border-sakura/25 bg-white text-sakura/70 transition-all duration-150 hover:border-sakura/40 hover:bg-sakura/[0.06] hover:text-sakura"
          onClick={() => onRemove(row.key)}
          type="button"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function TimeSelect({ min, onChange, value }: { min?: string; onChange: (value: string) => void; value: string }) {
  const [rawHour = "00", rawMinute = "00"] = value.split(":");
  const [minHour = "00", minMinute = "00"] = (min ?? "00:00").split(":");
  const hour = normalizeHour(rawHour);
  const minute = normalizeMinute(rawMinute);
  const selectClass =
    "w-[4.75rem] h-[38px] rounded-lg border border-ink/15 bg-white pl-3 pr-8 text-sm outline-none ring-matcha/30 transition-all duration-200 focus:border-matcha/50 focus:ring-4";

  function changeTime(part: "hour" | "minute", nextValue: string) {
    onChange(part === "hour" ? `${nextValue}:${minute}` : `${hour}:${nextValue}`);
  }

  return (
    <div className="grid grid-cols-[4.75rem_auto_4.75rem] items-center gap-1">
      <select className={selectClass} onChange={(event) => changeTime("hour", event.target.value)} value={hour}>
        {TIME_HOURS.map((option) => (
          <option disabled={min ? option < minHour : false} key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-sm text-sumi/45">:</span>
      <select className={selectClass} onChange={(event) => changeTime("minute", event.target.value)} value={minute}>
        {TIME_MINUTES.map((option) => (
          <option disabled={min ? hour === minHour && option < minMinute : false} key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function normalizeHour(hour: string) {
  return TIME_HOURS.includes(hour) ? hour : "00";
}

function normalizeMinute(minute: string) {
  return minute === "30" ? "30" : "00";
}

function getNextStartTimeForDate(rows: Row[], date: string, todayKey: string, defaultStartTime: string) {
  const baseStartTime = date === todayKey ? defaultStartTime : "18:00";
  const baseStartMinutes = parseTimeToMinutes(baseStartTime);
  const sameDayStarts = rows
    .filter((row) => row.availability_date === date)
    .map((row) => parseTimeToMinutes(row.start_time))
    .filter((minutes) => Number.isFinite(minutes));

  if (sameDayStarts.length === 0) {
    return baseStartTime;
  }

  const latestStartMinutes =
    Math.floor((24 * 60 - LESSON_DURATION_MINUTES) / BOOKING_START_INTERVAL_MINUTES) * BOOKING_START_INTERVAL_MINUTES;
  const nextMinutes = Math.max(baseStartMinutes, Math.max(...sameDayStarts) + BOOKING_START_INTERVAL_MINUTES);

  return toTimeValue(Math.min(nextMinutes, latestStartMinutes));
}

function getDayTone(date: string) {
  const weekday = getWeekdayFromDateKey(date);
  const holiday = isJapanHoliday(date);

  if (holiday || weekday === 0) {
    return {
      cellClass: "bg-sakura/5 hover:bg-sakura/10",
      dateClass: "text-sakura",
      isHoliday: holiday
    };
  }

  if (weekday === 6) {
    return {
      cellClass: "bg-sky-50 hover:bg-sky-100",
      dateClass: "text-sky-700",
      isHoliday: false
    };
  }

  return {
    cellClass: "bg-white hover:bg-paper",
    dateClass: "text-ink",
    isHoliday: false
  };
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

function isEditableSlot(row: Row, todayKey: string, currentTime: string) {
  return row.availability_date > todayKey || (row.availability_date === todayKey && row.start_time > currentTime);
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const minutes = Math.min(parseTimeToMinutes(time) + minutesToAdd, 23 * 60 + 59);
  return toTimeValue(minutes);
}
