import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type AuditAction = "booking.create" | "booking.cancel" | "availability.update";

type AuditLogParams = {
  action: AuditAction;
  actorId: string | null;
  metadata?: Record<string, unknown>;
  targetId?: string | null;
  targetType: "booking" | "date_availability";
};

export async function writeAuditLog(supabase: SupabaseClient, params: AuditLogParams) {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      action: params.action,
      actor_id: params.actorId,
      metadata: params.metadata ?? {},
      target_id: params.targetId ?? null,
      target_type: params.targetType
    });

    if (error) {
      console.error("Failed to write audit log:", error.message);
    }
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
