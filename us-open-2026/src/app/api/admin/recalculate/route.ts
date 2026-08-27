import { recalculateAllScores } from "@/lib/admin/recalculate";
import { TOURNAMENT_SLUG } from "@/lib/data";
import { requireAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const { data: tournament } = await admin.service.from("tournaments").select("id").eq("slug", TOURNAMENT_SLUG).maybeSingle();
  if (!tournament) return NextResponse.json({ error: "Import the tournament draw first." }, { status: 404 });
  try {
    const result = await recalculateAllScores(admin.service, tournament.id);
    await admin.service.from("admin_audit_log").insert({ admin_user_id: admin.userId, action: "scores.recalculate", details: result });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Recalculation failed." }, { status: 500 });
  }
}
