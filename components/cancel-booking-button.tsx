"use client";

import { CalendarX, Loader2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";

type CancelBookingButtonProps = {
  lessonLabel: string;
};

export function CancelBookingButton({ lessonLabel }: CancelBookingButtonProps) {
  const { pending } = useFormStatus();

  function confirmCancel(event: MouseEvent<HTMLButtonElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }

    const ok = window.confirm(`${lessonLabel}の予約をキャンセルしますか？\nこの操作は元に戻せません。`);

    if (!ok) {
      event.preventDefault();
    }
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg border border-sakura/25 px-3 py-2 text-sm text-sumi/70 transition-all duration-150 hover:border-sakura/40 hover:bg-sakura/[0.06] hover:text-sakura disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      onClick={confirmCancel}
      type="submit"
    >
      {pending ? <Loader2 className="animate-spin" size={15} /> : <CalendarX size={15} />}
      {pending ? "キャンセル中..." : "キャンセル"}
    </button>
  );
}
