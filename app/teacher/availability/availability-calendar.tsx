"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { availabilityIssueMessages, validateAvailabilitySlots } from "@/lib/availability-validation";
import { LESSON_DURATION_MINUTES } from "@/lib/constants";
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

    const startTime = date === todayKey ? defaultStartTime : "18:00";
    const endTime = addMinutesToTime(startTime, LESSON_DURATION_MINUTES);

    setSelectedDate(date);
    setRows((current) => [
      ...current,
      {
        key: `${date}-${crypto.randomUUID()}`,
        availability_date: date,
        start_time: startTime,
        end_time: endTime
      }
    ]);
  }

  function updateRow(key: string, field: "start_time" | "end_time", value: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  const currentMonthDates = dates.filter((date) => date < nextMonthStart);
  const nextMonthDates = dates.filter((date) => date >= nextMonthStart);
  const selectedRows = groupedRows.get(selectedDate) ?? [];

  return (
    <form action="/teacher/availability/save" className="space-y-5 rounded-lg border border-ink/10 bg-white p-4 shadow-soft" method="post">
      <input name="rangeStart" type="hidden" value={rangeStart} />
      <input name="rangeEnd" type="hidden" value={rangeEnd} />
      {editableRows.map((row) => (
        <div key={`hidden-${row.key}`}>
          <input name="slotDate" type="hidden" value={row.availability_date} />
          <input name="slotStart" type="hidden" value={row.start_time} />
          <input name="slotEnd" type="hidden" value={row.end_time} />
        </div>
      ))}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <MonthSection
            currentTime={currentTime}
            dates={currentMonthDates}
            groupedRows={groupedRows}
            onAdd={addRow}
            onSelect={setSelectedDate}
            selectedDate={selectedDate}
            title="今月"
            todayKey={todayKey}
          />
          <MonthSection
            currentTime={currentTime}
            dates={nextMonthDates}
            groupedRows={groupedRows}
            onAdd={addRow}
            onSelect={setSelectedDate}
            selectedDate={selectedDate}
            title="来月"
            todayKey={todayKey}
          />
        </div>
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
      className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-sumi/35"
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
  title: string;
  todayKey: string;
};

function MonthSection({
  currentTime,
  dates,
  groupedRows,
  onAdd,
  onSelect,
  selectedDate,
  title,
  todayKey
}: MonthSectionProps) {
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
      <div className="grid grid-cols-7 border-l border-t border-ink/10 text-center text-sm font-medium text-sumi/65">
        {WEEKDAYS.map((weekday, index) => (
          <div className={["border-b border-r border-ink/10 py-2", weekdayHeaderClass(index)].join(" ")} key={weekday}>
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l border-t border-ink/10">
        {cells.map((date, index) => {
          if (!date) {
            return <div className="min-h-24 border-b border-r border-ink/10 bg-paper/45" key={`blank-${index}`} />;
          }

          const rows = groupedRows.get(date) ?? [];
          const isPast = date < todayKey;
          const isToday = date === todayKey;
          const canAdd = date > todayKey || (isToday && currentTime < "23:00");
          const isSelected = date === selectedDate;
          const dayTone = getDayTone(date);

          return (
            <div
              className={[
                "min-h-28 border-b border-r border-ink/10 p-3 text-left transition",
                isPast ? "bg-sumi/[0.06] text-sumi/40" : dayTone.cellClass,
                isSelected ? "ring-2 ring-inset ring-matcha" : ""
              ].join(" ")}
              key={date}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  className="min-w-0 flex-1 text-left"
                  disabled={isPast}
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
                </button>
                {canAdd ? (
                  <button
                    aria-label={`${formatDateJa(date)}に時間を追加`}
                    className="grid size-8 shrink-0 place-items-center rounded-md border border-ink/15 bg-white/80 text-ink hover:bg-white"
                    onClick={() => onAdd(date)}
                    type="button"
                  >
                    <Plus size={16} />
                  </button>
                ) : null}
              </div>
              <button
                className="mt-4 w-full text-left text-sm text-sumi/65 disabled:text-sumi/40"
                disabled={isPast}
                onClick={() => onSelect(date)}
                type="button"
              >
                {rows.length > 0 ? (
                  <span
                    className={
                      isPast
                        ? "inline-flex rounded-md bg-sumi/10 px-2 py-1 text-xs font-medium text-sumi/45"
                        : "inline-flex rounded-md bg-matcha/10 px-2 py-1 text-xs font-medium text-matcha"
                    }
                  >
                    設定済み {rows.length} 件
                  </span>
                ) : (
                  "未設定"
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
  const canAdd = selectedDate > todayKey || (selectedDate === todayKey && currentTime < "23:00");

  return (
    <aside className="rounded-lg border border-ink/10 bg-paper/65 p-4 xl:sticky xl:top-24 xl:self-start">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-matcha">選択中の日付</p>
          <h3 className="text-xl font-semibold text-ink">{selectedDate ? formatDateJa(selectedDate) : "未選択"}</h3>
        </div>
        {canAdd ? (
          <button
            className="inline-flex items-center gap-1 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink"
            onClick={() => onAdd(selectedDate)}
            type="button"
          >
            <Plus size={16} />
            追加
          </button>
        ) : null}
      </div>

      {issueMessages.length > 0 ? (
        <div className="mt-4 space-y-1 rounded-md border border-sakura/30 bg-sakura/10 p-3 text-sm text-sakura">
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
    <div className={invalid ? "rounded-md border border-sakura/35 bg-sakura/5 p-3" : "rounded-md border border-ink/10 bg-white p-3"}>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <label className="grid gap-1 text-xs text-sumi">
          開始
          <input
            className="min-w-0 rounded-md border border-ink/15 px-3 py-2 text-base"
            min={minTime}
            onChange={(event) => onUpdate(row.key, "start_time", event.target.value)}
            step={1800}
            type="time"
            value={row.start_time}
          />
        </label>
        <label className="grid gap-1 text-xs text-sumi">
          終了
          <input
            className="min-w-0 rounded-md border border-ink/15 px-3 py-2 text-base"
            min={minTime}
            onChange={(event) => onUpdate(row.key, "end_time", event.target.value)}
            step={1800}
            type="time"
            value={row.end_time}
          />
        </label>
        <button
          aria-label="削除"
          className="grid size-10 place-items-center rounded-md border border-sakura/35 text-sakura hover:bg-sakura/10"
          onClick={() => onRemove(row.key)}
          type="button"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
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
