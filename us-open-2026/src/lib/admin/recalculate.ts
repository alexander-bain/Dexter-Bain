import { matchKey } from "@/lib/bracket";
import { scoreBracket } from "@/lib/scoring";
import type { BracketPicks, Division, OfficialResult, RoundNumber } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function recalculateAllScores(service: SupabaseClient, tournamentId: string) {
  const { data: matches, error: matchError } = await service.from("matches")
    .select("id,division,round,match_index,status,player1_id,player2_id,winner_id,player1:players!matches_player1_id_fkey(draw_position),player2:players!matches_player2_id_fkey(draw_position),winner:players!matches_winner_id_fkey(draw_position)")
    .eq("tournament_id", tournamentId);
  if (matchError) throw matchError;

  const results: OfficialResult[] = matches.map((match: any) => ({
    key: matchKey(match.division as Division, match.round, match.match_index),
    round: match.round as RoundNumber,
    status: match.status,
    participantOne: match.player1?.draw_position ?? null,
    participantTwo: match.player2?.draw_position ?? null,
    winner: match.winner?.draw_position ?? null,
  }));
  const matchById = new Map(matches.map((match: any) => [match.id, match]));

  const { data: brackets, error: bracketError } = await service.from("brackets")
    .select("id,bracket_picks(match_id,picked_player:players(draw_position))")
    .eq("tournament_id", tournamentId)
    .not("submitted_at", "is", null);
  if (bracketError) throw bracketError;

  const scoreRows = brackets.map((bracket: any) => {
    const picks: BracketPicks = {};
    for (const pick of bracket.bracket_picks ?? []) {
      const match: any = matchById.get(pick.match_id);
      if (match && pick.picked_player?.draw_position) {
        picks[matchKey(match.division, match.round, match.match_index)] = pick.picked_player.draw_position;
      }
    }
    const men = scoreBracket(picks, results.filter((result) => result.key.startsWith("men-")));
    const women = scoreBracket(picks, results.filter((result) => result.key.startsWith("women-")));
    return {
      bracket_id: bracket.id,
      men_score: men.points,
      women_score: women.points,
      combined_score: men.points + women.points,
      maximum_possible: men.maximumPossible + women.maximumPossible,
      mens_max_possible: men.maximumPossible,
      womens_max_possible: women.maximumPossible,
      correct_picks: men.correctPicks + women.correctPicks,
      updated_at: new Date().toISOString(),
    };
  });
  if (scoreRows.length) {
    const { error } = await service.from("bracket_scores").upsert(scoreRows, { onConflict: "bracket_id" });
    if (error) throw error;
  }
  return { recalculated: scoreRows.length };
}
