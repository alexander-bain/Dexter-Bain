import { TOURNAMENT_SLUG } from "@/lib/data";
import { requireAdmin } from "@/lib/supabase/server";

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return Response.json({ error: admin.message }, { status: admin.status });
  const { data: tournament } = await admin.service.from("tournaments").select("id").eq("slug", TOURNAMENT_SLUG).single();
  if (!tournament) return Response.json({ error: "Import the tournament first." }, { status: 404 });
  const { data: rows, error } = await admin.service.from("brackets").select("id,slug,display_name,title,division_scope,submitted_at,bracket_scores(mens_score,womens_score,combined_score,combined_max_possible,correct_picks)").eq("tournament_id", tournament.id).eq("is_public", true).not("submitted_at", "is", null);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  const header = ["id", "slug", "display_name", "title", "division_scope", "submitted_at", "mens_score", "womens_score", "combined_score", "maximum_possible", "correct_picks"];
  const lines = [header.join(","), ...(rows ?? []).map((row: any) => { const score = Array.isArray(row.bracket_scores) ? row.bracket_scores[0] : row.bracket_scores; return [row.id,row.slug,row.display_name,row.title,row.division_scope,row.submitted_at,score?.mens_score,score?.womens_score,score?.combined_score,score?.combined_max_possible,score?.correct_picks].map(csvCell).join(","); })];
  await admin.service.from("admin_audit_log").insert({ admin_user_id: admin.userId, action: "brackets.export", details: { count: rows?.length ?? 0 } });
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=us-open-2026-public-brackets.csv" } });
}
