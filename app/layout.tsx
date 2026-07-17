import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarCheck, GraduationCap } from "lucide-react";
import "./globals.css";
import { HeaderAuth, HeaderAuthFallback } from "@/components/header-auth";
import { NavLink } from "@/components/nav-link";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Yoyaku",
  description: "オンラインレッスン予約"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={inter.variable}>
      <body className={inter.className}>
        <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
            <Link className="group flex items-center gap-2 font-semibold tracking-normal text-ink" href="/">
              <span className="grid size-9 place-items-center rounded-md bg-matcha text-white transition-transform duration-150 group-hover:scale-105">
                <CalendarCheck size={19} />
              </span>
              Yoyaku
            </Link>
            <nav className="flex items-center gap-1 text-sm text-sumi">
              <NavLink
                activeClassName="bg-matcha/10 font-medium text-matcha hover:bg-matcha/15 hover:text-matcha"
                className="rounded-md px-3 py-2 transition-colors duration-150 hover:bg-ink/5 hover:text-ink"
                href="/teachers"
              >
                講師を探す
              </NavLink>
              <Suspense fallback={<HeaderAuthFallback />}>
                <HeaderAuth />
              </Suspense>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
        <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-ink/5 px-5 pb-8 pt-6 text-sm text-sumi/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} />
            オンラインレッスンの予約管理
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link className="transition-colors hover:text-ink" href="/terms">
              ご利用規約
            </Link>
            <Link className="transition-colors hover:text-ink" href="/privacy">
              プライバシーポリシー
            </Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
