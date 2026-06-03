import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, GraduationCap } from "lucide-react";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Yoyaku",
  description: "オンラインレッスン予約"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = hasSupabaseConfig()
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  return (
    <html lang="ja">
      <body>
        <header className="border-b border-ink/10 bg-paper/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
            <Link className="flex items-center gap-2 font-semibold tracking-normal text-ink" href="/">
              <span className="grid size-9 place-items-center rounded-md bg-matcha text-white">
                <CalendarCheck size={19} />
              </span>
              Yoyaku
            </Link>
            <nav className="flex items-center gap-2 text-sm text-sumi">
              <Link className="rounded-md px-3 py-2 hover:bg-ink/5" href="/teachers">
                講師を探す
              </Link>
              <Link className="rounded-md px-3 py-2 hover:bg-ink/5" href="/student/bookings">
                予約
              </Link>
              <Link className="rounded-md px-3 py-2 hover:bg-ink/5" href="/teacher/bookings">
                講師
              </Link>
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="hidden max-w-40 truncate rounded-md bg-matcha/10 px-3 py-2 text-matcha sm:inline">
                    {user.email}
                  </span>
                  <form action="/auth/sign-out" method="post">
                    <button className="rounded-md border border-ink/15 px-3 py-2 hover:bg-white" type="submit">
                      ログアウト
                    </button>
                  </form>
                </div>
              ) : (
                <Link className="rounded-md bg-ink px-3 py-2 text-white" href="/login">
                  ログイン
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
        <footer className="mx-auto flex max-w-7xl items-center gap-2 px-5 pb-8 pt-2 text-sm text-sumi/70">
          <GraduationCap size={16} />
          オンラインレッスンの予約管理
        </footer>
      </body>
    </html>
  );
}
