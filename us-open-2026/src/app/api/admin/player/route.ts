import { TOURNAMENT_SLUG } from "@/lib/data";
import { requireAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ division: z.enum(["men", "women"]), drawPosition: z.number().int().min(1).max(128), name: z.string().min(2), countryCode: z.string().length(3).nullable(), entryType: z.enum(["seed", "direct", "wildcard", "qualifier", "lucky-loser", "tbd"]) });

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { data: tournament } = await admin.service.from("tournaments").select("id").eq("slug", TOURNAMENT_SLUG).single();
  if (!tournament) return NextResponse.json({ error: "Import the tournament first." }, { status: 404 });
  const { data: oldValue } = await admin.service.from("players").select("id,name,full_name,country_code,entry_type").eq("tournament_id", tournament.id).eq("division", parsed.data.division).eq("draw_position", parsed.data.drawPosition).single();
  if (!oldValue) return NextResponse.json({ error: "Draw position not found." }, { status: 404 });
  const newValue = { name: parsed.data.name, full_name: parsed.data.name, country_code: parsed.data.countryCode, entry_type: parsed.data.entryType };
  const { error } = await admin.service.from("players").update(newValue).eq("id", oldValue.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.service.from("admin_audit_log").insert({ admin_user_id: admin.userId, action: "player.update", details: { division: parsed.data.division, drawPosition: parsed.data.drawPosition }, old_value: oldValue, new_value: newValue });
  return NextResponse.json({ updated: true, playerId: oldValue.id });
}
