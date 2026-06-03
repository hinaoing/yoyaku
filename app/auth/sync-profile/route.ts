import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { syncProfileForUser } from "@/lib/profiles";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  if (!token) {
    return NextResponse.json({ error: "Missing access token." }, { status: 401 });
  }

  try {
    const { url, anonKey } = getSupabaseConfig();
    const supabase = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: error?.message ?? "User not found." }, { status: 401 });
    }

    await syncProfileForUser(supabase, user);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync profile." },
      { status: 500 }
    );
  }
}
