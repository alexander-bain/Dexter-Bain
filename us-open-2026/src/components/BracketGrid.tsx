"use client";

import { buildMatchDefinitions, entrantsForMatch, findPlayer, ROUND_NAMES } from "@/lib/bracket";
import type { BracketPicks, Division, DrawPlayer, RoundNumber } from "@/lib/types";
import { useRef, useState } from "react";

interface BracketGridProps {
  division: Division;
  players: DrawPlayer[];
  picks: BracketPicks;
  locked?: boolean;
  onPick?: (matchKey: string, drawPosition: number) => void;
  pickStates?: Record<string, "correct" | "incorrect" | "pending">;
}

function PlayerLabel({ player }: { player: DrawPlayer | null }) {
  if (!player) return <span className="player-empty">Winner advances</span>;
  return (
    <>
      <span className="player-name">{player.seed ? <b>{player.seed}</b> : null}{player.name}</span>
      <span className="player-meta">{player.countryCode ?? "—"}{player.entryType === "wildcard" ? " · WC" : player.entryType === "tbd" ? " · TBD" : ""}</span>
    </>
  );
}

export function BracketGrid({ division, players, picks, locked = false, onPick, pickStates = {} }: BracketGridProps) {
  const matches = buildMatchDefinitions(division);
  const [mobileRound, setMobileRound] = useState<RoundNumber>(1);
  const touchStart = useRef<number | null>(null);
  function moveRound(direction: -1 | 1) {
    setMobileRound((current) => Math.min(7, Math.max(1, current + direction)) as RoundNumber);
  }
  return (
    <div className="bracket-shell">
      <div className="mobile-round-controls"><button onClick={() => moveRound(-1)} disabled={mobileRound === 1} aria-label="Previous round">← Previous</button><b>{mobileRound} / 7 · {ROUND_NAMES[mobileRound]}</b><button onClick={() => moveRound(1)} disabled={mobileRound === 7} aria-label="Next round">Next →</button></div>
    <div className="bracket-scroll" aria-label={`${division}'s bracket`} onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientX; if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 55) moveRound(end < touchStart.current ? 1 : -1); touchStart.current = null; }}>
      <div className="bracket-grid">
        {([1, 2, 3, 4, 5, 6, 7] as RoundNumber[]).map((round) => (
          <section className={`round-column round-${round} ${round === mobileRound ? "mobile-active" : ""}`} key={round}>
            <div className="round-heading"><span>0{round}</span><h3>{ROUND_NAMES[round]}</h3></div>
            <div className="round-matches">
              {matches.filter((match) => match.round === round).map((match) => {
                const entrants = entrantsForMatch(match, picks);
                return (
                  <article className="match-card" key={match.key}>
                    {([0, 1] as const).map((slot) => {
                      const player = findPlayer(players, entrants[slot]);
                      const selected = Boolean(player && picks[match.key] === player.drawPosition);
                      const pickState = selected ? pickStates[match.key] : undefined;
                      return (
                        <button
                          type="button"
                          className={`player-row ${selected ? "selected" : ""} ${pickState ? `pick-${pickState}` : ""}`}
                          key={`${match.key}-${slot}`}
                          disabled={!player || locked || !onPick}
                          onClick={() => player && onPick?.(match.key, player.drawPosition)}
                          aria-pressed={selected}
                        >
                          <PlayerLabel player={player} />
                          {selected && pickState && pickState !== "pending" ? <span className="result-label">{pickState === "correct" ? "Correct" : "Incorrect"}</span> : null}
                        </button>
                      );
                    })}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
    </div>
  );
}
