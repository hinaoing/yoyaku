"use client";

import { ChevronDown, GraduationCap, LogOut, Settings, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type AccountMenuProps = {
  avatarUrl?: string | null;
  email?: string | null;
  fullName?: string | null;
  isAdmin: boolean;
  isTeacher: boolean;
};

function initials(label: string) {
  return label.trim().slice(0, 1).toUpperCase() || "U";
}

export function AccountMenu({ avatarUrl, email, fullName, isAdmin, isTeacher }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const label = fullName || email || "User";

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex max-w-56 items-center gap-2 rounded-md bg-matcha/10 px-2.5 py-2 text-matcha transition-colors duration-150 hover:bg-matcha/15"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {avatarUrl ? (
          <img alt="" className="size-6 rounded-full object-cover" height={24} src={avatarUrl} width={24} />
        ) : (
          <span className="grid size-6 place-items-center rounded-full bg-matcha text-xs font-semibold text-white">
            {initials(label)}
          </span>
        )}
        <span className="hidden max-w-32 truncate sm:inline">{label}</span>
        <ChevronDown className={open ? "rotate-180 transition-transform" : "transition-transform"} size={15} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-slideDown overflow-hidden rounded-xl border border-ink/10 bg-white shadow-lg">
          <div className="border-b border-ink/10 px-4 py-3">
            <p className="truncate font-medium text-ink">{label}</p>
            {email ? <p className="mt-0.5 truncate text-xs text-sumi/55">{email}</p> : null}
          </div>
          <nav className="grid py-1 text-sm">
            <Link className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-ink/[0.04]" href="/account" onClick={() => setOpen(false)}>
              <User size={16} />
              プロフィール
            </Link>
            {isTeacher ? (
              <Link className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-ink/[0.04]" href="/teacher/settings" onClick={() => setOpen(false)}>
                <Settings size={16} />
                講師設定
              </Link>
            ) : (
              <Link className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-ink/[0.04]" href="/teacher-application" onClick={() => setOpen(false)}>
                <GraduationCap size={16} />
                講師になる
              </Link>
            )}
            {isAdmin ? (
              <Link className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-ink/[0.04]" href="/admin/teacher-applications" onClick={() => setOpen(false)}>
                <ShieldCheck size={16} />
                管理
              </Link>
            ) : null}
          </nav>
          <form action="/auth/sign-out" className="border-t border-ink/10" method="post">
            <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-sumi transition-colors hover:bg-ink/[0.04]" type="submit">
              <LogOut size={16} />
              ログアウト
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
