import { TOURNAMENT_SLUG } from "@/lib/data";
import { BracketDirectory, type DirectoryBracket } from "@/components/BracketDirectory";
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = { title: "Public brackets" };
export const dynamic = "force-dynamic";

export default async function BracketsPage() {
  const supabase = await getServerSupabase();
  const { data: tournament } = supabase ? await supabase.from("tournaments").select("id").eq("slug", TOURNAMENT_SLUG).maybeSingle() : { data: null };
  const { data: rows } = tournament && supabase ? await supabase.from("brackets")
    .select("id,title,public_slug,display_name,division_scope,submitted_at,bracket_scores(combined_score,maximum_possible)")
    .eq("tournament_id", tournament.id).eq("is_public", true).not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false }).limit(100) : { data: [] };
  const ids = (rows ?? []).map((row: any) => row.id);
  const { data: champions } = ids.length && supabase ? await supabase.from("bracket_picks").select("bracket_id,match:matches!inner(division,round),picked_player:players(full_name)").in("bracket_id", ids).eq("match.round", 7) : { data: [] };
  const championsByBracket = new Map<string, { menChampion?: string; womenChampion?: string }>();
  for (const row of champions ?? [] as any[]) { const match: any = Array.isArray((row as any).match) ? (row as any).match[0] : (row as any).match; const player: any = Array.isArray((row as any).picked_player) ? (row as any).picked_player[0] : (row as any).picked_player; if (match && player) championsByBracket.set((row as any).bracket_id, { ...championsByBracket.get((row as any).bracket_id), [`${match.division}Champion`]: player.full_name }); }
  const directoryRows: DirectoryBracket[] = (rows ?? []).map((row: any) => { const score = Array.isArray(row.bracket_scores) ? row.bracket_scores[0] : row.bracket_scores; return { id: row.id, slug: row.public_slug, title: row.title, displayName: row.display_name, scope: row.division_scope, submittedAt: row.submitted_at, score: score?.combined_score ?? 0, maximum: score?.maximum_possible ?? (row.division_scope === "both" ? 896 : 448), ...championsByBracket.get(row.id) }; });

  return (
    <div className="page-shell listing-page">
      <div className="listing-head"><div><div className="eyebrow"><span /> Public picks</div><h1>Bracket room.</h1><p>See how the field is calling New York, from first ball to both finals.</p></div><Link className="button" href="/create">Add your bracket</Link></div>
      {!rows?.length ? (
        <div className="empty-state"><span>00</span><h2>The room is open.</h2><p>No public brackets have been submitted yet. The first real entry will appear here—no seeded profiles or placeholder people.</p><Link href="/create" className="text-link">Build the first bracket →</Link></div>
      ) : <BracketDirectory rows={directoryRows} />}
    </div>
  );
}
