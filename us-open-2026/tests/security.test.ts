import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../supabase/migrations/202608270001_initial.sql", import.meta.url), "utf8");

describe("database permission contract", () => {
  it("enables RLS on every user-facing table", () => {
    for (const table of ["tournaments", "players", "matches", "profiles", "brackets", "bracket_picks", "bracket_scores", "admin_users", "admin_audit_log"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("limits public brackets to submitted public records", () => {
    expect(migration).toContain("is_public and submitted_at is not null");
    expect(migration).toContain("b.is_public and b.submitted_at is not null");
  });

  it("enforces ownership and the database lock for writes", () => {
    expect(migration).toContain("b.user_id = auth.uid() and now() < t.lock_at");
    expect(migration).toContain("Create picks in own editable bracket");
    expect(migration).toContain("Delete own editable bracket");
  });

  it("reserves official-data writes for admins", () => {
    expect(migration).toContain('create policy "Admins manage matches"');
    expect(migration).toContain("using (public.is_admin()) with check (public.is_admin())");
  });
});
