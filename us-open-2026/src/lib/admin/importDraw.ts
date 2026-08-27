import { buildMatchDefinitions } from "@/lib/bracket";
import { DEFAULT_LOCK_AT, draws, TOURNAMENT_SLUG } from "@/lib/data";
import { drawSchema } from "@/lib/drawValidation";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function importOfficialDraw(service: SupabaseClient) {
  const men = drawSchema.parse(draws.men);
  const women = drawSchema.parse(draws.women);
  const sourceMetadata = [...men.sourceMetadata, ...women.sourceMetadata];

  const { data: tournament, error: tournamentError } = await service.from("tournaments").upsert({
    slug: TOURNAMENT_SLUG,
    name: "2026 US Open",
    year: 2026,
    starts_at: "2026-08-30T15:00:00.000Z",
    lock_at: DEFAULT_LOCK_AT,
    ends_at: "2026-09-13T23:59:00.000Z",
    status: "upcoming",
    is_active: true,
    source_metadata: sourceMetadata,
  }, { onConflict: "slug" }).select("id").single();
  if (tournamentError) throw tournamentError;

  for (const draw of [men, women]) {
    const sourceUrl = draw.sourceMetadata[0].sourcePage;
    const { data: players, error: playerError } = await service.from("players").upsert(
      draw.players.map((player) => ({
        tournament_id: tournament.id,
        division: draw.division,
        draw_position: player.drawPosition,
        name: player.name,
        full_name: player.name,
        country_code: player.countryCode,
        seed: player.seed,
        entry_type: player.entryType,
        source_url: sourceUrl,
      })),
      { onConflict: "tournament_id,division,draw_position" },
    ).select("id,draw_position");
    if (playerError) throw playerError;

    const playerIds = new Map(players.map((player) => [player.draw_position, player.id]));
    const { error: matchError } = await service.from("matches").upsert(
      buildMatchDefinitions(draw.division).map((match) => ({
        tournament_id: tournament.id,
        division: draw.division,
        round: match.round,
        match_index: match.matchIndex,
        player1_id: match.round === 1 && typeof match.sourceOne === "number" ? playerIds.get(match.sourceOne) : null,
        player2_id: match.round === 1 && typeof match.sourceTwo === "number" ? playerIds.get(match.sourceTwo) : null,
      })),
      { onConflict: "tournament_id,division,round,match_index" },
    );
    if (matchError) throw matchError;
  }

  return { tournamentId: tournament.id, players: 256, matches: 254 };
}
