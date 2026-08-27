import { matchKey } from "@/lib/bracket";
import { PublicBracket } from "@/components/PublicBracket";
import { ShareButton } from "@/components/ShareButton";
import { draws } from "@/lib/data";
import { getServerSupabase } from "@/lib/supabase/server";
import type { BracketPicks, Division } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PublicBracketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await getServerSupabase();
  if (!supabase) return <div className="page-shell empty-state"><h1>Database not connected.</h1><p>Add the Supabase environment variables to load public bracket links.</p></div>;
  const { data: bracket } = await supabase.from("brackets")
    .select("id,title,created_at,submitted_at,division_scope,profiles!brackets_user_id_fkey(display_name),bracket_scores(men_score,women_score,combined_score,maximum_possible,correct_picks)")
    .eq("public_slug", slug).eq("is_public", true).not("submitted_at", "is", null).maybeSingle();
  if (!bracket) notFound();
  const { data: saved } = await supabase.from("bracket_picks")
    .select("match:matches(division,round,match_index,status,winner:players!matches_winner_id_fkey(draw_position)),picked_player:players(draw_position)").eq("bracket_id", bracket.id);
  const picks: BracketPicks = {};
  const pickStates: Record<string, "correct" | "incorrect" | "pending"> = {};
  const eliminated = new Set<number>();
  for (const row of saved ?? []) {
    const match = Array.isArray(row.match) ? row.match[0] : row.match;
    const player = Array.isArray(row.picked_player) ? row.picked_player[0] : row.picked_player;
    if (match && player) {
      const key = matchKey(match.division as Division, match.round, match.match_index);
      const winner = Array.isArray(match.winner) ? match.winner[0] : match.winner;
      picks[key] = player.draw_position;
      pickStates[key] = match.status === "completed" ? (winner?.draw_position === player.draw_position ? "correct" : "incorrect") : "pending";
      if (pickStates[key] === "incorrect") eliminated.add(player.draw_position);
    }
  }
  const profile: any = Array.isArray(bracket.profiles) ? bracket.profiles[0] : bracket.profiles;
  const score: any = Array.isArray(bracket.bracket_scores) ? bracket.bracket_scores[0] : bracket.bracket_scores;
  const menChampion = draws.men.players.find((player) => player.drawPosition === picks["men-r7-m1"]);
  const womenChampion = draws.women.players.find((player) => player.drawPosition === picks["women-r7-m1"]);
  return <div className="public-bracket-page"><section className="page-shell public-bracket-head"><div><div className="eyebrow"><span /> Public bracket</div><h1>{bracket.title}</h1><p>Built by <b>{profile?.display_name ?? "Bracket maker"}</b> · Created {new Date(bracket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div><div className="public-score"><div><b>{score?.combined_score ?? 0}</b><span>points</span></div><div><b>{score?.maximum_possible ?? (bracket.division_scope === "both" ? 896 : 448)}</b><span>max possible</span></div><div><b>{score?.correct_picks ?? 0}</b><span>correct</span></div></div><div className="public-head-actions"><ShareButton title={bracket.title} /><Link href="/create" className="button">Build yours</Link></div></section><section className="page-shell champion-picks"><div><span>Men’s champion</span><b>{menChampion?.name ?? "Not entered"}</b>{menChampion && eliminated.has(menChampion.drawPosition) ? <em>Eliminated</em> : <small>{score?.men_score ?? 0} points</small>}</div><div><span>Women’s champion</span><b>{womenChampion?.name ?? "Not entered"}</b>{womenChampion && eliminated.has(womenChampion.drawPosition) ? <em>Eliminated</em> : <small>{score?.women_score ?? 0} points</small>}</div></section><PublicBracket picks={picks} pickStates={pickStates} scope={bracket.division_scope as "men" | "women" | "both"} /></div>;
}
