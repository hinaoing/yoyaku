import { requireRole } from "@/lib/supabase/auth";
import { CalendarDays, Clock, Settings } from "lucide-react";
import { NavLink } from "@/components/nav-link";

const links = [
  { href: "/teacher/bookings", label: "予約一覧", icon: Clock },
  { href: "/teacher/availability", label: "空き時間", icon: CalendarDays },
  { href: "/teacher/settings", label: "設定", icon: Settings }
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireRole("teacher");

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="h-fit space-y-1 rounded-xl border border-ink/10 bg-white p-2 shadow-soft">
        {links.map((link) => (
          <NavLink
            activeClassName="bg-matcha/10 font-medium text-matcha hover:bg-matcha/15 hover:text-matcha [&>svg]:text-matcha"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-sumi transition-all duration-150 hover:bg-matcha/[0.07] hover:text-ink"
            href={link.href}
            key={link.href}
          >
            <link.icon size={16} className="shrink-0 text-sumi/50" />
            {link.label}
          </NavLink>
        ))}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
