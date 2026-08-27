import { recalculateAllScores } from "@/lib/admin/recalculate";
import { TOURNAMENT_SLUG } from "@/lib/data";
import { requireAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const resultSchema = z.object({
  division: z.enum(["men", "women"]),
  round: z.number().int().min(1).max(7),
  matchIndex: z.number().int().min(1).max(64),
  status: z.enum(["scheduled", "in_progress", "completed"]),
  participantOneDrawPosition: z.number().int().min(1).max(128).nullable().optional(),
  participantTwoDrawPosition: z.number().int().min(1).max(128).nullable().optional(),
  winnerDrawPosition: z.number().int().min(1).max(128).nullable().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const parsed = resultSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: tournament } = await admin.service.from("tournaments").select("id").eq("slug", TOURNAMENT_SLUG).maybeSingle();
  if (!tournament) return NextResponse.json({ error: "Import the tournament draw first." }, { status: 404 });

  const positions = [parsed.data.participantOneDrawPosition, parsed.data.participantTwoDrawPosition, parsed.data.winnerDrawPosition].filter(Boolean) as number[];
  const { data: players } = await admin.service.from("players").select("id,draw_position").eq("tournament_id", tournament.id).eq("division", parsed.data.division).in("draw_position", positions.length ? positions : [-1]);
  const playerIds = new Map((players ?? []).map((player) => [player.draw_position, player.id]));
  const playerId = (position: number | null | undefined) => position ? playerIds.get(position) ?? null : null;

  if (parsed.data.status === "completed" && !playerId(parsed.data.winnerDrawPosition)) {
    return NextResponse.json({ error: "A completed match needs a valid winner." }, { status: 400 });
  }

  const { data: oldMatch } = await admin.service.from("matches").select("id,status,player1_id,player2_id,winner_id,completed_at")
    .eq("tournament_id", tournament.id).eq("division", parsed.data.division).eq("round", parsed.data.round).eq("match_index", parsed.data.matchIndex).maybeSingle();

  const update: Record<string, unknown> = {
    status: parsed.data.status,
    winner_id: playerId(parsed.data.winnerDrawPosition),
    completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
  };
  if (parsed.data.participantOneDrawPosition !== undefined) update.player1_id = playerId(parsed.data.participantOneDrawPosition);
  if (parsed.data.participantTwoDrawPosition !== undefined) update.player2_id = playerId(parsed.data.participantTwoDrawPosition);

  const { data: match, error } = await admin.service.from("matches").update(update)
    .eq("tournament_id", tournament.id)
    .eq("division", parsed.data.division)
    .eq("round", parsed.data.round)
    .eq("match_index", parsed.data.matchIndex)
    .select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (parsed.data.round < 7) {
    const nextRound = parsed.data.round + 1;
    const nextIndex = Math.ceil(parsed.data.matchIndex / 2);
    const slot = parsed.data.matchIndex % 2 === 1 ? "player1_id" : "player2_id";
    const { data: nextMatch } = await admin.service.from("matches").select("id,status,winner_id").eq("tournament_id", tournament.id).eq("division", parsed.data.division).eq("round", nextRound).eq("match_index", nextIndex).single();
    if (nextMatch) {
      const changedWinner = oldMatch?.winner_id !== playerId(parsed.data.winnerDrawPosition);
      const nextUpdate: Record<string, unknown> = { [slot]: parsed.data.status === "completed" ? playerId(parsed.data.winnerDrawPosition) : null };
      if (changedWinner && nextMatch.status === "completed") Object.assign(nextUpdate, { status: "scheduled", winner_id: null, completed_at: null });
      await admin.service.from("matches").update(nextUpdate).eq("id", nextMatch.id);
    }
  }

  const scores = await recalculateAllScores(admin.service, tournament.id);
  await admin.service.from("admin_audit_log").insert({
    admin_user_id: admin.userId,
    action: "result.update",
    details: { matchId: match.id }, old_value: oldMatch, new_value: parsed.data,
  });
  return NextResponse.json({ updated: true, ...scores });
}
