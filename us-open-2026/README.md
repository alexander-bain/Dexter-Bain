# Open Bracket — 2026 US Open

A production-ready Next.js + TypeScript prediction game for complete 128-player men’s and women’s US Open singles brackets. Visitors can build a private draft with frictionless anonymous Supabase Auth, submit a public bracket, share a stable URL, browse real public entries, and follow a scored leaderboard.

No people, brackets, scores, or activity are fabricated. Empty public areas stay intentionally empty until real users submit entries.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Supabase Postgres, Auth, Row Level Security, and server-only admin operations
- Vitest for draw integrity, advancement, scoring, leaderboard, and lock tests
- Vercel-ready deployment

## Local setup

1. Create a Supabase project.
2. In Supabase Auth settings, enable **Anonymous Sign-Ins**. Public viewing never requires authentication; anonymous auth exists only to own and resume a draft.
3. Run `supabase/migrations/202608270001_initial.sql` in the Supabase SQL editor (or through the Supabase CLI).
4. Copy `.env.example` to `.env.local` and fill in the values. Keep `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_IMPORT_TOKEN` server-only. Never prefix them with `NEXT_PUBLIC_`.
5. Install and start:

   ```bash
   pnpm install
   pnpm validate:draw
   pnpm import:draw
   pnpm dev
   ```

`ADMIN_EMAIL` is documentation/configuration for the approved operator address; authorization is ultimately enforced by the `admin_users` table. The site remains a truthful read-only draw preview when Supabase is not configured. Save, share, directory, leaderboard, and admin operations activate when the database is connected and the draw import has run.

## Official draw data

Structured source files live at:

- `src/data/usOpen2026Men.json`
- `src/data/usOpen2026Women.json`

Each file has 128 ordered draw positions plus source URL and verification timestamp. The initial data was checked against the official US Open draw pages/PDF and official WTA draw on August 27, 2026. Slots that were still unresolved are labeled `Qualifier/Lucky Loser TBD N`; no player was guessed.

To update qualifier or lucky-loser slots safely:

1. Confirm the replacement on the official US Open draw page.
2. Edit the existing JSON object at the same `drawPosition`; do not insert, delete, or reorder rows.
3. Set `name`, `countryCode` when officially available, and `entryType` to `qualifier` or `lucky-loser`.
4. Refresh the source timestamp.
5. Run `pnpm validate:draw` and `pnpm test`, then `pnpm import:draw`.

The import upserts by tournament, division, and draw position. That preserves player IDs and every existing user pick while updating labels in place.

## Scoring

Correct winners earn:

| Round | Points |
| --- | ---: |
| Round of 128 | 1 |
| Round of 64 | 2 |
| Round of 32 | 4 |
| Round of 16 | 8 |
| Quarterfinals | 16 |
| Semifinals | 32 |
| Final | 64 |

Each division is worth 448 points; the combined perfect score is 896. `maximum_possible` includes earned points plus future picks whose selected player has not been eliminated. Leaderboard ties sort by combined score, maximum possible, correct picks, earliest submission, then display name for deterministic rendering.

## Locking and bracket safety

The imported default lock is `2026-08-30T15:00:00Z` (11:00 a.m. Eastern). Confirm the precise official first-ball time before launch and change `tournaments.lock_at` if needed. The database—not the browser clock—is the security boundary:

- RLS allows bracket and pick writes only for the owner and only while `now() < lock_at`.
- Public visitors see only `is_public = true` brackets with `submitted_at` set.
- Changing an early pick clears downstream selections that can no longer occur, after user confirmation.
- `save_bracket_picks` replaces a draft’s pick set inside one database transaction.
- The same transaction rejects players who did not advance through the user’s own earlier picks.
- A submission trigger rejects incomplete brackets (127 picks for one draw or 254 for both).
- Result entry and score recalculation require an admin user or the server-only import token.

## Authentication and public sharing

The builder starts an anonymous Supabase Auth session automatically, so visitors can make picks without a password. That anonymous user owns the draft under RLS, and the same browser resumes its most recently updated bracket. Display name and optional bracket title are the only public identity fields. Email, auth UUID, IP address, and location are never selected into public views.

Submitting sets a stable `/brackets/[slug]` link. Public bracket pages are server-rendered and require no login. The builder offers Copy Link, View Public Bracket, and the browser Share API. Cross-device editing requires linking/upgrading the anonymous Supabase identity; the current minimal UI provides magic-link sign-in for admins, while participant account linking is listed below as a known limitation.

## Row Level Security policies

- `tournaments`, `players`, and `matches`: everyone can read; only `is_admin()` users can mutate official data.
- `profiles`: a user can create/update their own profile; public reads are limited to the owner, admins, or profiles attached to submitted public brackets.
- `brackets`: public reads require both `is_public` and `submitted_at`; owners can read drafts and create/update/delete only before the database lock. Submitted brackets remain editable by their owner until lock.
- `bracket_picks`: public reads follow bracket visibility; insert/update/delete requires ownership and an unlocked tournament.
- `bracket_scores`: public reads follow bracket visibility; only admins write refreshed scores.
- `admin_users` and `admin_audit_log`: normal users cannot manage these tables; admin mutations require `is_admin()` and every admin tool uses a server-verified access token.

The service role bypasses RLS by design and exists only in server code and the trusted import script. It is never bundled into client components.

## Admin workflow

1. Create or sign in a Supabase Auth user.
2. Add that UUID once in SQL:

   ```sql
   insert into public.admin_users (user_id) values ('AUTH-USER-UUID');
   ```

3. Visit `/admin` and use the email magic link.
4. Import the draw. Validation failures are returned directly to the protected console.
5. Replace a qualifier placeholder or correct a player/country by division and stable draw position; the player row is updated in place, preserving every saved pick.
6. Enter, correct, or undo a result. Completed winners advance into the next official match; downstream completed results are invalidated when their feeder changes. Scores recalculate immediately.
7. Adjust tournament status and the configurable lock, recalculate all scores, or export submitted public brackets as CSV.

All admin mutations are server-side and recorded in `admin_audit_log` with action, old value, new value, admin UUID, and timestamp. The public client never receives the service-role key.

For a live-results provider, call the protected result endpoint from a scheduled server job after mapping the provider’s player IDs to stable draw positions. Keep the same validation, audit, and full-score recalculation path; do not expose provider credentials in the browser.

## Deploy to Vercel

1. Import this directory as a Vercel project (set the Root Directory to `us-open-2026` when deploying from the larger repository).
2. Add all `.env.example` variables in Vercel. Set `NEXT_PUBLIC_SITE_URL` to the production origin.
3. Deploy, then run the draw import once from a trusted local machine or call `POST /api/admin/draw` as an approved admin.
4. Add the production URL to Supabase Auth redirect URLs for admin magic links.
5. Verify anonymous sign-in, draft resume, a real submission, its public link, the lock boundary, and admin result entry before sharing publicly.

## Verification

```bash
pnpm validate:draw
pnpm test
pnpm typecheck
pnpm build
```

The migration deliberately enables RLS on every public table. Keep RLS tests and the service-role boundary intact when adding features.

## Known limitations

- As of the checked August 27 draw state, 18 men’s and 20 women’s qualifier/lucky-loser positions are still explicitly unresolved. Update them only from the official draw using the stable-slot workflow above.
- The default lock timestamp is configurable and must be confirmed against the final official order of play before public launch.
- Real match results are entered manually or through the documented protected endpoint; no third-party live-score feed is bundled.
- Anonymous drafts resume on the same browser. A participant-facing “connect email” upgrade screen is not included yet; deploying teams can add it with Supabase identity linking without changing bracket ownership.
- Automated tests cover draw structure, bracket progression/invalidation, completion, scoring/maximum possible, lock behavior, ranking, placeholder replacement, and the static RLS contract. A live Supabase staging project is still required for end-to-end RLS and cross-browser sharing verification.
