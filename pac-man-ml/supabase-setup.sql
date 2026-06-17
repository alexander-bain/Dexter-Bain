-- Maze Muncher ML cloud persistence for Supabase.
-- Run this in the Supabase SQL editor, then put your Project URL and anon key
-- into pac-man-ml/supabase-config.js.

create table if not exists public.maze_muncher_learners (
  player_id text primary key,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maze_muncher_samples (
  id text primary key,
  player_id text not null references public.maze_muncher_learners(player_id) on delete cascade,
  features jsonb not null,
  action text not null,
  label integer not null,
  reason text,
  source text,
  tile_key text,
  game_time double precision,
  created_at timestamptz not null default now()
);

create index if not exists maze_muncher_samples_player_id_idx
  on public.maze_muncher_samples(player_id, created_at);

alter table public.maze_muncher_learners enable row level security;
alter table public.maze_muncher_samples enable row level security;

drop policy if exists "maze muncher learners read" on public.maze_muncher_learners;
drop policy if exists "maze muncher learners insert" on public.maze_muncher_learners;
drop policy if exists "maze muncher learners update" on public.maze_muncher_learners;
drop policy if exists "maze muncher learners delete" on public.maze_muncher_learners;
drop policy if exists "maze muncher samples read" on public.maze_muncher_samples;
drop policy if exists "maze muncher samples insert" on public.maze_muncher_samples;
drop policy if exists "maze muncher samples delete" on public.maze_muncher_samples;

-- These policies intentionally allow anonymous browser clients to save maze
-- learner data. The player_id is a random local UUID, so this is game telemetry,
-- not private user data.
create policy "maze muncher learners read"
  on public.maze_muncher_learners for select
  to anon, authenticated
  using (true);

create policy "maze muncher learners insert"
  on public.maze_muncher_learners for insert
  to anon, authenticated
  with check (true);

create policy "maze muncher learners update"
  on public.maze_muncher_learners for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "maze muncher learners delete"
  on public.maze_muncher_learners for delete
  to anon, authenticated
  using (true);

create policy "maze muncher samples read"
  on public.maze_muncher_samples for select
  to anon, authenticated
  using (true);

create policy "maze muncher samples insert"
  on public.maze_muncher_samples for insert
  to anon, authenticated
  with check (true);

create policy "maze muncher samples delete"
  on public.maze_muncher_samples for delete
  to anon, authenticated
  using (true);
