import menDraw from "../data/usOpen2026Men.json";
import womenDraw from "../data/usOpen2026Women.json";
import type { Division, OfficialDrawFile } from "./types";

export const draws = {
  men: menDraw as OfficialDrawFile,
  women: womenDraw as OfficialDrawFile,
} satisfies Record<Division, OfficialDrawFile>;

export const TOURNAMENT_SLUG = "us-open-2026";
export const DEFAULT_LOCK_AT = "2026-08-30T15:00:00.000Z";

export function drawFor(division: Division) {
  return draws[division];
}
