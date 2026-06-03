import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function syncProfileForUser(supabase: SupabaseClient, user: User) {
  const profile = {
    id: user.id,
    email: user.email ?? null,
    full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null
  };

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    throw new Error(`Could not read profile: ${readError.message}`);
  }

  if (existing) {
    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);

    if (error) {
      throw new Error(`Could not update profile: ${error.message}`);
    }

    return;
  }

  const { error } = await supabase.from("profiles").insert({
    ...profile,
    role: "student"
  });

  if (error) {
    throw new Error(`Could not create profile: ${error.message}`);
  }
}
