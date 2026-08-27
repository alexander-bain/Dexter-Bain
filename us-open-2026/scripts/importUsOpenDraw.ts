import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { importOfficialDraw } from "../src/lib/admin/importDraw";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing.");

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const result = await importOfficialDraw(service);
console.log(`Imported ${result.players} players and ${result.matches} matches for tournament ${result.tournamentId}.`);
