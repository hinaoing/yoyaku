import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncProfileForUser } from "@/lib/profiles";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function requireUser() {
  const { supabase, user } = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await syncProfileForUser(supabase, user);

  return { supabase, user };
}

export async function requireRole(role: "teacher" | "student") {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== role) {
    redirect(role === "teacher" ? "/teachers" : "/teacher/bookings");
  }

  return { supabase, user };
}
