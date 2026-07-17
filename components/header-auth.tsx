import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { NavLink } from "@/components/nav-link";
import { isAdminEmail } from "@/lib/admin";
import { getCurrentUser, getViewerProfile, type ViewerProfile } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";

const navLinkClass = "rounded-md px-3 py-2 transition-colors duration-150 hover:bg-ink/5 hover:text-ink";
const navLinkActiveClass = "bg-matcha/10 font-medium text-matcha hover:bg-matcha/15 hover:text-matcha";

export async function HeaderAuth() {
  let user: Awaited<ReturnType<typeof getCurrentUser>>["user"] = null;
  let profile: ViewerProfile | null = null;

  if (hasSupabaseConfig()) {
    try {
      ({ user } = await getCurrentUser());
      profile = user ? await getViewerProfile() : null;
    } catch {
      // Auth fetch failed — render as unauthenticated
      user = null;
      profile = null;
    }
  }

  const isTeacher = profile?.role === "teacher";
  const isAdmin = isAdminEmail(user?.email);

  return (
    <>
      {(!user || !isTeacher) && (
        <NavLink activeClassName={navLinkActiveClass} className={navLinkClass} href="/student/bookings">
          予約
        </NavLink>
      )}
      {isTeacher && (
        <NavLink activeClassName={navLinkActiveClass} className={navLinkClass} href="/teacher/bookings">
          講師
        </NavLink>
      )}
      {user ? (
        <AccountMenu
          avatarUrl={profile?.avatar_url ?? null}
          email={user.email}
          fullName={profile?.full_name ?? null}
          isAdmin={isAdmin}
          isTeacher={isTeacher}
        />
      ) : (
        <Link className="rounded-md bg-matcha px-3 py-2 text-white transition-colors duration-150 hover:bg-matcha/90" href="/login">
          ログイン
        </Link>
      )}
    </>
  );
}

export function HeaderAuthFallback() {
  return (
    <>
      <span aria-hidden className="hidden h-9 w-14 animate-softPulse rounded-md bg-ink/5 sm:block" />
      <span aria-hidden className="h-9 w-20 animate-softPulse rounded-md bg-matcha/10" />
    </>
  );
}
