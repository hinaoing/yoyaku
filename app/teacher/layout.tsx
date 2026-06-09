import Link from "next/link";
import { requireRole } from "@/lib/supabase/auth";

const links = [
  { href: "/teacher/bookings", label: "予約一覧" },
  { href: "/teacher/availability", label: "空き時間" },
  { href: "/teacher/settings", label: "設定" }
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireRole("teacher");

  return (
    <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
      <aside className="h-fit rounded-lg border border-ink/10 bg-white p-2 shadow-soft">
        {links.map((link) => (
          <Link className="block rounded-md px-3 py-2 text-sm text-sumi hover:bg-paper" href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
