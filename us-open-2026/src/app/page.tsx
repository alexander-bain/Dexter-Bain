import { DEFAULT_LOCK_AT, TOURNAMENT_SLUG } from "@/lib/data";
import { formatLockTime } from "@/lib/lock";
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await getServerSupabase();
  let brackets = 0;
  let players = 256;
  let lockAt = DEFAULT_LOCK_AT;
  let tournamentStatus = "Upcoming";
  let championLeaders: { men?: { name: string; percent: number }; women?: { name: string; percent: number } } = {};
  if (supabase) {
    const { data: tournament } = await supabase.from("tournaments").select("id,lock_at,status").eq("slug", TOURNAMENT_SLUG).maybeSingle();
    if (tournament) {
      lockAt = tournament.lock_at;
      tournamentStatus = tournament.status[0].toUpperCase() + tournament.status.slice(1);
      const [{ count: bracketCount }, { count: playerCount }] = await Promise.all([
        supabase.from("brackets").select("id", { count: "exact", head: true }).eq("tournament_id", tournament.id).not("submitted_at", "is", null).eq("is_public", true),
        supabase.from("players").select("id", { count: "exact", head: true }).eq("tournament_id", tournament.id),
      ]);
      brackets = bracketCount ?? 0;
      players = playerCount ?? 256;
      if (brackets >= 5) {
        const { data: finals } = await supabase.from("bracket_picks").select("picked_player:players(full_name),match:matches!inner(division,round)").eq("match.round", 7);
        for (const division of ["men", "women"] as const) {
          const counts = new Map<string, number>();
          const divisionRows = (finals ?? []).filter((row: any) => (Array.isArray(row.match) ? row.match[0] : row.match)?.division === division);
          for (const row of divisionRows as any[]) { const player = Array.isArray(row.picked_player) ? row.picked_player[0] : row.picked_player; if (player?.full_name) counts.set(player.full_name, (counts.get(player.full_name) ?? 0) + 1); }
          const leader = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
          if (leader) championLeaders[division] = { name: leader[0], percent: Math.round((leader[1] / divisionRows.length) * 100) };
        }
      }
    }
  }
  return (
    <>
      <section className="hero page-shell">
        <div className="eyebrow"><span /> 2026 US Open · New York</div>
        <h1>2026 US Open<br /><em>Prediction Bracket</em></h1>
        <p>Pick every winner in the men’s and women’s singles draws. Share your bracket and climb the leaderboard.</p>
        <div className="hero-actions"><Link className="button button-large" href="/create">Create a bracket</Link><Link className="text-link" href="/brackets">Browse public brackets <span>→</span></Link><Link className="text-link" href="/leaderboard">Leaderboard <span>→</span></Link><Link className="text-link" href="/how-it-works">How it works <span>→</span></Link></div>
        <div className="hero-rule" />
        <div className="hero-stats">
          <div><strong>{players}</strong><span>official draw slots</span></div>
          <div><strong>{brackets.toLocaleString()}</strong><span>public brackets</span></div>
          <div><strong>{tournamentStatus}</strong><span>tournament status</span></div>
          <div><strong>{formatLockTime(lockAt)}</strong><span>picks lock · ET</span></div>
        </div>
      </section>
      <section className="feature-band">
        <div className="page-shell feature-grid">
          <article><span>01</span><h2>Pick the whole draw</h2><p>Advance a winner from every first-round match through both championship finals.</p></article>
          <article><span>02</span><h2>Share your call</h2><p>Publish one clean link for friends to inspect round by round, without an account wall.</p></article>
          <article><span>03</span><h2>Score as it happens</h2><p>Later rounds are worth more. Maximum-possible tracking keeps every live bracket honest.</p></article>
        </div>
      </section>
      <section className="page-shell draw-preview">
        <div><div className="eyebrow"><span /> One bracket. Two champions.</div><h2>The complete New York test.</h2></div>
        <div className="champion-cards">
          <article><small>{championLeaders.men ? "Most-picked men’s champion" : "Men’s No. 1 seed"}</small><b>{championLeaders.men?.name ?? <>Alexander<br />Zverev</>}</b><span>{championLeaders.men ? `${championLeaders.men.percent}% of submitted brackets` : "GER · Top half"}</span></article>
          <article className="orange"><small>{championLeaders.women ? "Most-picked women’s champion" : "Women’s No. 1 seed"}</small><b>{championLeaders.women?.name ?? <>Aryna<br />Sabalenka</>}</b><span>{championLeaders.women ? `${championLeaders.women.percent}% of submitted brackets` : "BLR · Top half"}</span></article>
          <Link href="/create"><small>Your call</small><b>Choose<br />both winners</b><span>Start picking →</span></Link>
        </div>
      </section>
    </>
  );
}
