"use client";

import { BracketGrid } from "@/components/BracketGrid";
import { draws } from "@/lib/data";
import type { BracketPicks, Division } from "@/lib/types";
import { useState } from "react";

export function PublicBracket({ picks, pickStates, scope }: { picks: BracketPicks; pickStates: Record<string, "correct" | "incorrect" | "pending">; scope: "men" | "women" | "both" }) {
  const [division, setDivision] = useState<Division>("men");
  const activeDivision = scope === "women" ? "women" : scope === "men" ? "men" : division;
  return <><div className="division-tabs public-tabs" role="tablist">{scope !== "women" ? <button className={activeDivision === "men" ? "active" : ""} onClick={() => setDivision("men")}>Men’s draw</button> : null}{scope !== "men" ? <button className={activeDivision === "women" ? "active" : ""} onClick={() => setDivision("women")}>Women’s draw</button> : null}</div><BracketGrid division={activeDivision} players={draws[activeDivision].players} picks={picks} pickStates={pickStates} locked /></>;
}
