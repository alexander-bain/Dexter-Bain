"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type DirectoryBracket = { id: string; slug: string; title: string; displayName: string; scope: "men" | "women" | "both"; submittedAt: string; score: number; maximum: number; menChampion?: string; womenChampion?: string };

export function BracketDirectory({ rows }: { rows: DirectoryBracket[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [scope, setScope] = useState("all");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => rows.filter((row) => `${row.displayName} ${row.title}`.toLowerCase().includes(query.toLowerCase()) && (scope === "all" || row.scope === scope)).sort((a, b) => sort === "score" ? b.score - a.score : sort === "maximum" ? b.maximum - a.maximum : new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()), [query, rows, scope, sort]);
  const visible = filtered.slice(0, page * 20);
  return <><div className="directory-tools"><input aria-label="Search public brackets" placeholder="Search name or title" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /><select aria-label="Sort public brackets" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="score">Current score</option><option value="maximum">Maximum possible</option></select><select aria-label="Filter bracket draws" value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">All entries</option><option value="both">Both draws</option><option value="men">Men’s only</option><option value="women">Women’s only</option></select></div><div className="bracket-directory">{visible.map((row, index) => <Link href={`/brackets/${row.slug}`} className="directory-card" key={row.id}><span className="directory-rank">{String(index + 1).padStart(2, "0")}</span><div><h2>{row.title}</h2><p>by {row.displayName} · {row.scope === "both" ? "Both draws" : `${row.scope}'s draw`} · {new Date(row.submittedAt).toLocaleDateString()}</p><small>{row.menChampion ? `M: ${row.menChampion}` : ""}{row.menChampion && row.womenChampion ? " · " : ""}{row.womenChampion ? `W: ${row.womenChampion}` : ""}</small></div><div className="directory-score"><b>{row.score}</b><span>points · max {row.maximum}</span></div><span className="directory-arrow">View ↗</span></Link>)}</div>{visible.length < filtered.length ? <button className="button button-quiet load-more" onClick={() => setPage((value) => value + 1)}>Load 20 more</button> : null}</>;
}
