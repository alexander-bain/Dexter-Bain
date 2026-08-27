"use client";

import { BracketGrid } from "@/components/BracketGrid";
import { completedPickCount, findPlayer, matchKey, selectWinner } from "@/lib/bracket";
import { DEFAULT_LOCK_AT, draws, TOURNAMENT_SLUG } from "@/lib/data";
import { formatLockTime, isLocked } from "@/lib/lock";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { BracketPicks, Division } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DbMaps = {
  tournamentId: string;
  lockAt: string;
  players: Map<string, string>;
  matches: Map<string, string>;
};

const supabase = getBrowserSupabase();

function makeSlug(name: string) {
  const stem = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 22) || "bracket";
  return `${stem}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

function picksForScope(picks: BracketPicks, scope: "men" | "women" | "both") {
  if (scope === "both") return picks;
  return Object.fromEntries(Object.entries(picks).filter(([key]) => key.startsWith(`${scope}-`)));
}

export function BracketBuilder() {
  const [division, setDivision] = useState<Division>("men");
  const [scope, setScope] = useState<"men" | "women" | "both">("both");
  const [picks, setPicks] = useState<BracketPicks>({});
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("My 2026 US Open Bracket");
  const [bracketId, setBracketId] = useState<string | null>(null);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [db, setDb] = useState<DbMaps | null>(null);
  const [status, setStatus] = useState("Preparing secure autosave…");
  const [submitted, setSubmitted] = useState(false);
  const hydrated = useRef(false);
  const locked = isLocked(db?.lockAt ?? DEFAULT_LOCK_AT);
  const menCount = completedPickCount("men", picks);
  const womenCount = completedPickCount("women", picks);
  const totalCount = scope === "men" ? menCount : scope === "women" ? womenCount : menCount + womenCount;
  const requiredCount = scope === "both" ? 254 : 127;
  const menChampion = findPlayer(draws.men.players, picks["men-r7-m1"]);
  const womenChampion = findPlayer(draws.women.players, picks["women-r7-m1"]);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!supabase) {
        setStatus("Preview mode — connect Supabase to save and share.");
        hydrated.current = true;
        return;
      }
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const result = await supabase.auth.signInAnonymously();
        session = result.data.session;
        if (result.error) { setStatus(`Sign-in unavailable: ${result.error.message}`); return; }
      }
      const { data: tournament } = await supabase.from("tournaments").select("id,lock_at").eq("slug", TOURNAMENT_SLUG).maybeSingle();
      if (!tournament || !session || cancelled) {
        setStatus("Database is connected, but the official draw has not been imported yet.");
        hydrated.current = true;
        return;
      }
      const [{ data: dbPlayers }, { data: dbMatches }] = await Promise.all([
        supabase.from("players").select("id,division,draw_position").eq("tournament_id", tournament.id),
        supabase.from("matches").select("id,division,round,match_index").eq("tournament_id", tournament.id),
      ]);
      const maps: DbMaps = {
        tournamentId: tournament.id,
        lockAt: tournament.lock_at,
        players: new Map((dbPlayers ?? []).map((player) => [`${player.division}-${player.draw_position}`, player.id])),
        matches: new Map((dbMatches ?? []).map((match) => [matchKey(match.division, match.round, match.match_index), match.id])),
      };
      setDb(maps);

      const { data: existing } = await supabase.from("brackets")
        .select("id,title,public_slug,submitted_at,division_scope,profiles!brackets_user_id_fkey(display_name)")
        .eq("user_id", session.user.id).eq("tournament_id", tournament.id)
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) {
        setBracketId(existing.id);
        setPublicSlug(existing.public_slug);
        setTitle(existing.title);
        setScope(existing.division_scope as "men" | "women" | "both");
        if (existing.division_scope !== "both") setDivision(existing.division_scope as Division);
        setSubmitted(Boolean(existing.submitted_at));
        const profile = Array.isArray(existing.profiles) ? existing.profiles[0] : existing.profiles;
        if (profile?.display_name) setDisplayName(profile.display_name);
        const { data: saved } = await supabase.from("bracket_picks")
          .select("match:matches(division,round,match_index),picked_player:players(draw_position)")
          .eq("bracket_id", existing.id);
        const restored: BracketPicks = {};
        for (const row of saved ?? []) {
          const match = Array.isArray(row.match) ? row.match[0] : row.match;
          const player = Array.isArray(row.picked_player) ? row.picked_player[0] : row.picked_player;
          if (match && player) restored[matchKey(match.division as Division, match.round, match.match_index)] = player.draw_position;
        }
        setPicks(restored);
        setStatus(existing.submitted_at ? "Submitted — edits still autosave until the lock." : "Draft restored from this browser.");
      } else {
        setStatus("Private draft ready. Your name is only shown after submission.");
      }
      hydrated.current = true;
    }
    hydrate();
    return () => { cancelled = true; };
  }, []);

  const serializedPicks = useMemo(() => JSON.stringify(picks), [picks]);
  const persistPicks = useCallback(async (id: string, maps: DbMaps, nextPicks: BracketPicks) => {
    if (!supabase) return;
    const payload = Object.entries(nextPicks).flatMap(([key, position]) => {
      const divisionKey = key.startsWith("women-") ? "women" : "men";
      const matchId = maps.matches.get(key);
      const playerId = maps.players.get(`${divisionKey}-${position}`);
      return matchId && playerId ? [{ match_id: matchId, player_id: playerId }] : [];
    });
    const { error } = await supabase.rpc("save_bracket_picks", { target_bracket_id: id, picks: payload });
    setStatus(error ? `Save failed: ${error.message}` : `Saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
  }, []);

  useEffect(() => {
    if (!hydrated.current || !bracketId || !db || locked) return;
    const timer = window.setTimeout(() => persistPicks(bracketId, db, picksForScope(JSON.parse(serializedPicks), scope)), 650);
    return () => window.clearTimeout(timer);
  }, [bracketId, db, locked, persistPicks, scope, serializedPicks]);

  async function ensureBracket() {
    if (!supabase || !db) { setStatus("Connect Supabase and import the draw before saving."); return null; }
    if (displayName.trim().length < 2) { setStatus("Add a display name with at least 2 characters."); return null; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus("Your secure browser session expired. Refresh and try again."); return null; }
    const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, display_name: displayName.trim() });
    if (profileError) { setStatus(`Could not save profile: ${profileError.message}`); return null; }
    if (bracketId) {
      const { error } = await supabase.from("brackets").update({ title: title.trim(), display_name: displayName.trim(), division_scope: scope, is_public: true }).eq("id", bracketId);
      if (error) { setStatus(`Could not update bracket: ${error.message}`); return null; }
      return bracketId;
    }
    const slug = makeSlug(displayName);
    const { data, error } = await supabase.from("brackets").insert({
      user_id: user.id, tournament_id: db.tournamentId, public_slug: slug,
      display_name: displayName.trim(), division_scope: scope,
      title: title.trim() || "My 2026 US Open Bracket", is_public: true,
    }).select("id,public_slug").single();
    if (error) { setStatus(`Could not create bracket: ${error.message}`); return null; }
    setBracketId(data.id);
    setPublicSlug(data.public_slug);
    return data.id;
  }

  async function saveDraft() {
    const id = await ensureBracket();
    if (id && db) { await persistPicks(id, db, picksForScope(picks, scope)); setStatus("Draft saved. You can close this tab and resume on this browser."); }
  }

  async function submitBracket() {
    if (totalCount !== requiredCount) { setStatus(`Complete all required picks first — ${requiredCount - totalCount} remaining.`); return; }
    const id = await ensureBracket();
    if (!id || !supabase || !db) return;
    await persistPicks(id, db, picksForScope(picks, scope));
    const { error } = await supabase.from("brackets").update({ submitted_at: new Date().toISOString(), is_public: true }).eq("id", id);
    if (error) setStatus(`Submission failed: ${error.message}`);
    else { setSubmitted(true); setStatus("Bracket submitted. Your public link is ready."); }
  }

  function choose(key: string, position: number) {
    const next = selectWinner(division, picks, key, position);
    if (next.cleared.length && !window.confirm(`Changing this result clears ${next.cleared.length} later pick${next.cleared.length === 1 ? "" : "s"}. Continue?`)) return;
    setPicks(next.picks);
  }

  async function copyShareLink() {
    if (!publicSlug) { setStatus("Save your bracket first to create a public link."); return; }
    await navigator.clipboard.writeText(`${window.location.origin}/brackets/${publicSlug}`);
    setStatus("Public bracket link copied.");
  }

  async function shareBracket() {
    if (!publicSlug) return;
    const url = `${window.location.origin}/brackets/${publicSlug}`;
    if (navigator.share) await navigator.share({ title, text: `${displayName}'s 2026 US Open bracket`, url });
    else await copyShareLink();
  }

  function changeScope(next: "men" | "women" | "both") {
    setScope(next);
    if (next !== "both") setDivision(next);
  }

  return (
    <>
      <section className="builder-toolbar">
        <div className="builder-fields">
          <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} placeholder="Your name" disabled={locked} /></label>
          <label>Bracket title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} disabled={locked} /></label>
        </div>
        <div className="scope-choice" aria-label="Draws to predict">
          {(["men", "women", "both"] as const).map((value) => <button type="button" className={scope === value ? "active" : ""} onClick={() => changeScope(value)} disabled={Boolean(bracketId) || locked} key={value}>{value === "both" ? "Both draws" : `${value[0].toUpperCase()}${value.slice(1)} only`}</button>)}
        </div>
        <div className="progress-stack">
          <div className="progress-copy"><b>{totalCount} / {requiredCount} picks</b><span>{status}</span></div>
          <div className="progress-track"><span style={{ width: `${(totalCount / requiredCount) * 100}%` }} /></div>
          <div className="champion-summary"><span>Men: <b>{scope === "women" ? "Not entered" : menChampion?.name ?? "Not chosen"}</b></span><span>Women: <b>{scope === "men" ? "Not entered" : womenChampion?.name ?? "Not chosen"}</b></span></div>
        </div>
        <div className="builder-actions">
          <button className="button button-quiet" onClick={saveDraft} disabled={locked}>Save draft</button>
          <button className="button" onClick={submitBracket} disabled={locked || totalCount !== requiredCount}>{submitted ? "Update submission" : "Submit bracket"}</button>
          <button className="button button-quiet" onClick={copyShareLink} disabled={!publicSlug}>Copy link</button>
        </div>
      </section>
      <div className="lock-note">Picks lock {formatLockTime(db?.lockAt ?? DEFAULT_LOCK_AT)} ET. {locked ? "This bracket is read-only." : "Drafts and submitted brackets can be edited until then."}</div>
      {submitted && publicSlug ? <div className="submission-success"><div><b>Bracket submitted.</b><span>Your public page is live. You can still edit until the lock.</span></div><a className="button button-quiet" href={`/brackets/${publicSlug}`}>View public bracket</a><button className="button" onClick={shareBracket}>Share</button></div> : null}
      <div className="division-tabs" role="tablist">
        {scope !== "women" ? <button className={division === "men" ? "active" : ""} onClick={() => setDivision("men")}>Men’s draw <span>{menCount}/127</span></button> : null}
        {scope !== "men" ? <button className={division === "women" ? "active" : ""} onClick={() => setDivision("women")}>Women’s draw <span>{womenCount}/127</span></button> : null}
      </div>
      <BracketGrid division={division} players={draws[division].players} picks={picks} locked={locked} onPick={choose} />
    </>
  );
}
