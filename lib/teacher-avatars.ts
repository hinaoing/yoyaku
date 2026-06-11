import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type TeacherAvatarRow = {
  id: string;
  avatar_url: string | null;
};

export async function getTeacherAvatarUrlMap(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  if (uniqueUserIds.length === 0) {
    return new Map<string, string | null>();
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", uniqueUserIds)
      .returns<TeacherAvatarRow[]>();

    if (error) {
      return new Map<string, string | null>();
    }

    return new Map((data ?? []).map((profile) => [profile.id, profile.avatar_url]));
  } catch {
    return new Map<string, string | null>();
  }
}
