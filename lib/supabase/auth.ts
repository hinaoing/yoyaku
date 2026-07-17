import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncProfileForUser } from "@/lib/profiles";
import type { UserRole } from "@/lib/types";

// cache() dedupes these per request: layout, pages, and nested layouts share
// a single auth lookup / profile query instead of issuing their own.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return { supabase, user };
});

const ensureProfileSynced = cache(async () => {
  const { supabase, user } = await getCurrentUser();

  if (user) {
    await syncProfileForUser(supabase, user);
  }
});

export type ViewerProfile = {
  role: UserRole | null;
  full_name: string | null;
  avatar_url: string | null;
};

export const getViewerProfile = cache(async (): Promise<ViewerProfile | null> => {
  const { supabase, user } = await getCurrentUser();

  if (!user) {
    return null;
  }

  // Sync must complete before the first profile read so a first-time login
  // sees the freshly inserted row no matter which caller wins the race.
  await ensureProfileSynced();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    role: (profile?.role as UserRole) ?? null,
    full_name: profile?.full_name ?? null,
    avatar_url: profile?.avatar_url ?? null
  };
});

export async function requireUser() {
  const { supabase, user } = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfileSynced();

  return { supabase, user };
}

export async function requireRole(role: "teacher" | "student") {
  const { supabase, user } = await requireUser();
  const profile = await getViewerProfile();

  if (profile?.role !== role) {
    redirect(role === "teacher" ? "/teachers" : "/teacher/bookings");
  }

  return { supabase, user };
}
