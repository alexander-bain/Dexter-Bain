"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import { useState } from "react";

const supabase = getBrowserSupabase();

export function AdminConsole() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Sign in with an admin-approved Supabase user.");
  const [division, setDivision] = useState("men");
  const [round, setRound] = useState(1);
  const [matchIndex, setMatchIndex] = useState(1);
  const [p1, setP1] = useState(1);
  const [p2, setP2] = useState(2);
  const [winner, setWinner] = useState(1);
  const [matchStatus, setMatchStatus] = useState<"scheduled" | "in_progress" | "completed">("completed");
  const [playerPosition, setPlayerPosition] = useState(1);
  const [playerName, setPlayerName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [entryType, setEntryType] = useState("direct");
  const [lockAt, setLockAt] = useState("2026-08-30T15:00:00.000Z");
  const [tournamentStatus, setTournamentStatus] = useState("upcoming");

  async function sendMagicLink() {
    if (!supabase) { setMessage("Supabase is not configured."); return; }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setMessage(error ? error.message : "Check your email for the secure admin sign-in link.");
  }

  async function adminPost(path: string, body?: object) {
    if (!supabase) { setMessage("Supabase is not configured."); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setMessage("Use the email sign-in first."); return; }
    setMessage("Working…");
    const response = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    setMessage(response.ok ? JSON.stringify(result) : `Error: ${typeof result.error === "string" ? result.error : JSON.stringify(result.error)}`);
  }

  async function exportCsv() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setMessage("Use the email sign-in first."); return; }
    const response = await fetch("/api/admin/export", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!response.ok) { setMessage(`Export failed: ${await response.text()}`); return; }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = url; link.download = "us-open-2026-public-brackets.csv"; link.click(); URL.revokeObjectURL(url);
    setMessage("CSV export downloaded.");
  }

  return (
    <div className="admin-console">
      <section className="admin-card"><span>Authentication</span><h2>Admin sign-in</h2><p>Only users listed in <code>admin_users</code> can call the protected tools.</p><div className="inline-form"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" /><button className="button" onClick={sendMagicLink}>Send magic link</button></div></section>
      <section className="admin-card"><span>Official data</span><h2>Draw controls</h2><p>Import is idempotent: it updates draw positions without replacing bracket records.</p><div className="admin-actions"><button className="button" onClick={() => adminPost("/api/admin/draw")}>Import official draw</button><button className="button button-quiet" onClick={() => adminPost("/api/admin/recalculate")}>Recalculate every score</button><button className="button button-quiet" onClick={exportCsv}>Export public CSV</button></div></section>
      <section className="admin-card"><span>Draw correction</span><h2>Update a player slot</h2><div className="result-fields"><label>Division<select value={division} onChange={(event) => setDivision(event.target.value)}><option value="men">Men</option><option value="women">Women</option></select></label><label>Draw position<input type="number" min="1" max="128" value={playerPosition} onChange={(event) => setPlayerPosition(Number(event.target.value))} /></label><label>Official name<input value={playerName} onChange={(event) => setPlayerName(event.target.value)} /></label><label>Country code<input value={countryCode} maxLength={3} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} /></label><label>Entry type<select value={entryType} onChange={(event) => setEntryType(event.target.value)}>{["direct","seed","wildcard","qualifier","lucky-loser","tbd"].map((value) => <option key={value}>{value}</option>)}</select></label></div><button className="button" onClick={() => adminPost("/api/admin/player", { division, drawPosition: playerPosition, name: playerName, countryCode: countryCode || null, entryType })}>Update slot everywhere</button></section>
      <section className="admin-card"><span>Tournament control</span><h2>Lock & status</h2><div className="result-fields"><label>Lock time (ISO)<input value={lockAt} onChange={(event) => setLockAt(event.target.value)} /></label><label>Status<select value={tournamentStatus} onChange={(event) => setTournamentStatus(event.target.value)}><option>upcoming</option><option>live</option><option>complete</option></select></label></div><div className="admin-actions"><button className="button" onClick={() => adminPost("/api/admin/tournament", { lockAt, status: tournamentStatus, isActive: true })}>Save tournament</button><button className="button button-quiet" onClick={() => adminPost("/api/admin/tournament", { lockAt: new Date().toISOString(), status: tournamentStatus, isActive: true })}>Lock now</button></div></section>
      <section className="admin-card admin-result"><span>Match desk</span><h2>Enter or undo a result</h2><div className="result-fields"><label>Division<select value={division} onChange={(event) => setDivision(event.target.value)}><option value="men">Men</option><option value="women">Women</option></select></label><label>Round<input type="number" min="1" max="7" value={round} onChange={(event) => setRound(Number(event.target.value))} /></label><label>Match #<input type="number" min="1" max="64" value={matchIndex} onChange={(event) => setMatchIndex(Number(event.target.value))} /></label><label>Status<select value={matchStatus} onChange={(event) => setMatchStatus(event.target.value as typeof matchStatus)}><option value="scheduled">Scheduled / undo</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label><label>Player 1 position<input type="number" min="1" max="128" value={p1} onChange={(event) => setP1(Number(event.target.value))} /></label><label>Player 2 position<input type="number" min="1" max="128" value={p2} onChange={(event) => setP2(Number(event.target.value))} /></label><label>Winner position<input type="number" min="1" max="128" value={winner} onChange={(event) => setWinner(Number(event.target.value))} /></label></div><button className="button" onClick={() => adminPost("/api/admin/results", { division, round, matchIndex, status: matchStatus, participantOneDrawPosition: p1, participantTwoDrawPosition: p2, winnerDrawPosition: matchStatus === "completed" ? winner : null })}>Save result & score brackets</button></section>
      <div className="admin-status" role="status">{message}</div>
    </div>
  );
}
