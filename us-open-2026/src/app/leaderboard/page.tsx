import { TOURNAMENT_SLUG } from "@/lib/data";
import { LeaderboardTable, type PublicLeaderboardRow } from "@/components/LeaderboardTable";
import { getServerSupabase } from "@/lib/supabase/server";
import type { LeaderboardRow } from "@/lib/types";
import Link from "next/link";

export const metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await getServerSupabase();
  const { data: tournament } = supabase ? await supabase.from("tournaments").select("id").eq("slug", TOURNAMENT_SLUG).maybeSingle() : { data: null };
  const { data } = tournament && supabase ? await supabase.from("brackets")
    .select("id,title,public_slug,display_name,submitted_at,bracket_scores!inner(men_score,women_score,combined_score,maximum_possible,correct_picks)")
    .eq("tournament_id", tournament.id).eq("is_public", true).not("submitted_at", "is", null) : { data: [] };
  const ids = (data ?? []).map((row: any) => row.id);
  const { data: championPicks } = ids.length && supabase ? await supabase.from("bracket_picks").select("bracket_id,match:matches!inner(division,round),picked_player:players(full_name)").in("bracket_id", ids).eq("match.round", 7) : { data: [] };
  const champions = new Map<string, { menChampion?: string; womenChampion?: string }>();
  for (const row of (championPicks ?? []) as any[]) { const match = Array.isArray(row.match) ? row.match[0] : row.match; const player = Array.isArray(row.picked_player) ? row.picked_player[0] : row.picked_player; if (match && player) champions.set(row.bracket_id, { ...champions.get(row.bracket_id), [`${match.division}Champion`]: player.full_name }); }
  const rows = (data ?? []).map((row: any): PublicLeaderboardRow => {
    const score = Array.isArray(row.bracket_scores) ? row.bracket_scores[0] : row.bracket_scores;
    return { id: row.id, title: row.title, displayName: row.display_name, slug: row.public_slug, submittedAt: row.submitted_at, menScore: score.men_score, womenScore: score.women_score, combinedScore: score.combined_score, maximumPossible: score.maximum_possible, correctPicks: score.correct_picks, ...champions.get(row.id) };
  });

  return (
    <div className="page-shell listing-page leaderboard-page">
      <div className="listing-head"><div><div className="eyebrow"><span /> Live standings</div><h1>Leaderboard.</h1><p>Combined men’s and women’s scores, ordered by the official tiebreak rules.</p></div><div className="leaderboard-key"><span>Updated after result entry</span><b>896 max</b></div></div>
      {!rows.length ? <div className="empty-state"><span>—</span><h2>No scores yet.</h2><p>Submitted brackets appear after the draw is imported and scored. We never fill the table with fake competitors.</p><Link href="/create" className="text-link">Create a bracket →</Link></div> : <LeaderboardTable rows={rows} />}
    </div>
  );
}
