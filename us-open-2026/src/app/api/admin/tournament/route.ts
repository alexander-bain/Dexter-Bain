import { TOURNAMENT_SLUG } from "@/lib/data";
import { requireAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ lockAt: z.string().datetime(), status: z.enum(["upcoming", "live", "complete"]), isActive: z.boolean() });

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { data: oldValue } = await admin.service.from("tournaments").select("id,lock_at,status,is_active").eq("slug", TOURNAMENT_SLUG).single();
  if (!oldValue) return NextResponse.json({ error: "Import the tournament first." }, { status: 404 });
  const newValue = { lock_at: parsed.data.lockAt, status: parsed.data.status, is_active: parsed.data.isActive };
  const { error } = await admin.service.from("tournaments").update(newValue).eq("id", oldValue.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.service.from("admin_audit_log").insert({ admin_user_id: admin.userId, action: "tournament.update", old_value: oldValue, new_value: newValue });
  return NextResponse.json({ updated: true, ...newValue });
}
