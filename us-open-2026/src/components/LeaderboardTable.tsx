"use client";

import { sortLeaderboard } from "@/lib/leaderboard";
import type { LeaderboardRow } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

export type PublicLeaderboardRow = LeaderboardRow & { title: string; menScore: number; womenScore: number; menChampion?: string; womenChampion?: string };

export function LeaderboardTable({ rows }: { rows: PublicLeaderboardRow[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("combined");
  const visible = useMemo(() => {
    const filtered = rows.filter((row) => `${row.displayName} ${row.title}`.toLowerCase().includes(query.toLowerCase()));
    if (sort === "men") return [...filtered].sort((a, b) => b.menScore - a.menScore || b.combinedScore - a.combinedScore);
    if (sort === "women") return [...filtered].sort((a, b) => b.womenScore - a.womenScore || b.combinedScore - a.combinedScore);
    if (sort === "maximum") return [...filtered].sort((a, b) => b.maximumPossible - a.maximumPossible || b.combinedScore - a.combinedScore);
    return sortLeaderboard(filtered) as PublicLeaderboardRow[];
  }, [query, rows, sort]);
  return <><div className="directory-tools leaderboard-tools"><input aria-label="Search leaderboard" placeholder="Find a bracket" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Sort leaderboard" value={sort} onChange={(event) => setSort(event.target.value)}><option value="combined">Combined score</option><option value="men">Men’s score</option><option value="women">Women’s score</option><option value="maximum">Maximum possible</option></select></div><div className="leaderboard-table"><div className="leaderboard-row leaderboard-header"><span>Rank</span><span>Bracket</span><span>Men</span><span>Women</span><span>Combined</span><span>Max</span><span>Predicted champions</span></div>{visible.slice(0, 100).map((row, index) => <Link className="leaderboard-row" href={`/brackets/${row.slug}`} key={row.id}><b>{index + 1}</b><span><strong>{row.displayName}</strong><small>{row.title}</small></span><span>{row.menScore}</span><span>{row.womenScore}</span><strong>{row.combinedScore}</strong><span>{row.maximumPossible}</span><small>{row.menChampion ?? "—"} / {row.womenChampion ?? "—"}</small></Link>)}</div></>;
}
