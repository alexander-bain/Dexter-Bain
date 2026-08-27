create extension if not exists pgcrypto;

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  year integer not null default 2026,
  starts_at timestamptz not null,
  lock_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'complete')),
  is_active boolean not null default true,
  source_metadata jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  division text not null check (division in ('men', 'women')),
  draw_position integer not null check (draw_position between 1 and 128),
  name text not null,
  full_name text not null,
  country_code text,
  seed integer check (seed between 1 and 32),
  entry_type text not null check (entry_type in ('seed', 'direct', 'wildcard', 'qualifier', 'lucky-loser', 'tbd')),
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, division, draw_position)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  division text not null check (division in ('men', 'women')),
  round integer not null check (round between 1 and 7),
  round_number integer generated always as (round) stored,
  round_name text generated always as (case round when 1 then 'Round of 128' when 2 then 'Round of 64' when 3 then 'Round of 32' when 4 then 'Round of 16' when 5 then 'Quarterfinals' when 6 then 'Semifinals' when 7 then 'Final' end) stored,
  match_index integer not null,
  draw_slot_start integer generated always as (((match_index - 1) * power(2, round)::integer) + 1) stored,
  player1_id uuid references public.players(id),
  player2_id uuid references public.players(id),
  player_one_id uuid generated always as (player1_id) stored,
  player_two_id uuid generated always as (player2_id) stored,
  winner_id uuid references public.players(id),
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (tournament_id, division, round, match_index)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brackets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  public_slug text not null unique check (public_slug ~ '^[a-z0-9-]{6,40}$'),
  slug text generated always as (public_slug) stored,
  display_name text not null check (char_length(display_name) between 2 and 40),
  title text not null default 'My 2026 US Open Bracket' check (char_length(title) between 2 and 80),
  division_scope text not null default 'both' check (division_scope in ('men', 'women', 'both')),
  is_public boolean not null default true,
  submitted_at timestamptz,
  is_submitted boolean generated always as (submitted_at is not null) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bracket_picks (
  id uuid not null default gen_random_uuid() unique,
  bracket_id uuid not null references public.brackets(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  picked_player_id uuid not null references public.players(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bracket_id, match_id)
);

create table public.bracket_scores (
  bracket_id uuid primary key references public.brackets(id) on delete cascade,
  men_score integer not null default 0,
  women_score integer not null default 0,
  combined_score integer not null default 0,
  maximum_possible integer not null default 896,
  correct_picks integer not null default 0,
  mens_score integer generated always as (men_score) stored,
  womens_score integer generated always as (women_score) stored,
  mens_max_possible integer not null default 448,
  womens_max_possible integer not null default 448,
  combined_max_possible integer generated always as (mens_max_possible + womens_max_possible) stored,
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users(id),
  action text not null,
  action_type text generated always as (action) stored,
  details jsonb not null default '{}'::jsonb,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index brackets_public_index on public.brackets (tournament_id, submitted_at desc) where is_public and submitted_at is not null;
create index matches_lookup_index on public.matches (tournament_id, division, round, match_index);
create index bracket_picks_player_index on public.bracket_picks (picked_player_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tournaments_updated before update on public.tournaments for each row execute function public.set_updated_at();
create trigger players_updated before update on public.players for each row execute function public.set_updated_at();
create trigger matches_updated before update on public.matches for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger brackets_updated before update on public.brackets for each row execute function public.set_updated_at();
create trigger bracket_picks_updated before update on public.bracket_picks for each row execute function public.set_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()) $$;

create or replace function public.bracket_is_editable(target_bracket_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.brackets b
    join public.tournaments t on t.id = b.tournament_id
    where b.id = target_bracket_id and b.user_id = auth.uid() and now() < t.lock_at
  )
$$;

create or replace function public.validate_bracket_pick() returns trigger language plpgsql as $$
declare
  bracket_tournament uuid;
  match_tournament uuid;
  player_tournament uuid;
  match_division text;
  player_division text;
begin
  select tournament_id into bracket_tournament from public.brackets where id = new.bracket_id;
  select tournament_id, division into match_tournament, match_division from public.matches where id = new.match_id;
  select tournament_id, division into player_tournament, player_division from public.players where id = new.picked_player_id;
  if bracket_tournament is distinct from match_tournament or bracket_tournament is distinct from player_tournament or match_division is distinct from player_division then
    raise exception 'Pick must use a player and match from the bracket tournament and division';
  end if;
  return new;
end;
$$;
create trigger validate_pick before insert or update on public.bracket_picks for each row execute function public.validate_bracket_pick();

create or replace function public.save_bracket_picks(target_bracket_id uuid, picks jsonb) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not public.bracket_is_editable(target_bracket_id) then raise exception 'Bracket is locked or not owned by this user'; end if;
  delete from public.bracket_picks where bracket_id = target_bracket_id;
  insert into public.bracket_picks (bracket_id, match_id, picked_player_id)
  select target_bracket_id, (pick->>'match_id')::uuid, (pick->>'player_id')::uuid
  from jsonb_array_elements(picks) pick;
  if exists (
    select 1 from public.bracket_picks bp
    join public.matches m on m.id = bp.match_id
    where bp.bracket_id = target_bracket_id and (
      (m.round = 1 and bp.picked_player_id is distinct from m.player1_id and bp.picked_player_id is distinct from m.player2_id)
      or (m.round > 1 and not exists (
        select 1 from public.bracket_picks prior_pick
        join public.matches prior_match on prior_match.id = prior_pick.match_id
        where prior_pick.bracket_id = target_bracket_id
          and prior_match.tournament_id = m.tournament_id
          and prior_match.division = m.division
          and prior_match.round = m.round - 1
          and prior_match.match_index in (m.match_index * 2 - 1, m.match_index * 2)
          and prior_pick.picked_player_id = bp.picked_player_id
      ))
    )
  ) then raise exception 'Bracket contains a player who did not advance into that match'; end if;
end;
$$;

create or replace function public.validate_bracket_submission() returns trigger language plpgsql as $$
begin
  if new.submitted_at is not null and (old.submitted_at is null or new.submitted_at is distinct from old.submitted_at) then
    if (select count(*) from public.bracket_picks where bracket_id = new.id) <> (case when new.division_scope = 'both' then 254 else 127 end) then
      raise exception 'A submitted bracket must contain every required pick';
    end if;
  end if;
  return new;
end;
$$;
create trigger validate_submission before update on public.brackets for each row execute function public.validate_bracket_submission();

create or replace function public.initialize_bracket_score() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.submitted_at is not null and old.submitted_at is null then
    insert into public.bracket_scores (bracket_id, maximum_possible, mens_max_possible, womens_max_possible)
    values (new.id, case when new.division_scope = 'both' then 896 else 448 end, case when new.division_scope in ('men','both') then 448 else 0 end, case when new.division_scope in ('women','both') then 448 else 0 end)
    on conflict (bracket_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger initialize_score after update on public.brackets for each row execute function public.initialize_bracket_score();

alter table public.tournaments enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.profiles enable row level security;
alter table public.brackets enable row level security;
alter table public.bracket_picks enable row level security;
alter table public.bracket_scores enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "Public reads tournaments" on public.tournaments for select using (true);
create policy "Admins manage tournaments" on public.tournaments for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads players" on public.players for select using (true);
create policy "Admins manage players" on public.players for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads matches" on public.matches for select using (true);
create policy "Admins manage matches" on public.matches for all using (public.is_admin()) with check (public.is_admin());

create policy "Read public bracket profiles or own profile" on public.profiles for select
using (id = auth.uid() or public.is_admin() or exists (
  select 1 from public.brackets b where b.user_id = profiles.id and b.is_public and b.submitted_at is not null
));
create policy "Users create own profile" on public.profiles for insert with check (id = auth.uid());
create policy "Users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Read public submitted or owned brackets" on public.brackets for select
using ((is_public and submitted_at is not null) or user_id = auth.uid() or public.is_admin());
create policy "Create own bracket before lock" on public.brackets for insert
with check (user_id = auth.uid() and exists (select 1 from public.tournaments t where t.id = tournament_id and now() < t.lock_at));
create policy "Update own editable bracket" on public.brackets for update
using (public.bracket_is_editable(id)) with check (user_id = auth.uid() and public.bracket_is_editable(id));
create policy "Delete own editable bracket" on public.brackets for delete using (public.bracket_is_editable(id));

create policy "Read picks for visible brackets" on public.bracket_picks for select
using (exists (select 1 from public.brackets b where b.id = bracket_id and ((b.is_public and b.submitted_at is not null) or b.user_id = auth.uid() or public.is_admin())));
create policy "Create picks in own editable bracket" on public.bracket_picks for insert with check (public.bracket_is_editable(bracket_id));
create policy "Update picks in own editable bracket" on public.bracket_picks for update using (public.bracket_is_editable(bracket_id)) with check (public.bracket_is_editable(bracket_id));
create policy "Delete picks in own editable bracket" on public.bracket_picks for delete using (public.bracket_is_editable(bracket_id));

create policy "Read scores for visible brackets" on public.bracket_scores for select
using (exists (select 1 from public.brackets b where b.id = bracket_id and ((b.is_public and b.submitted_at is not null) or b.user_id = auth.uid() or public.is_admin())));
create policy "Admins manage scores" on public.bracket_scores for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins read admin list" on public.admin_users for select using (public.is_admin() or user_id = auth.uid());
create policy "Admins read audit log" on public.admin_audit_log for select using (public.is_admin());
create policy "Admins write audit log" on public.admin_audit_log for insert with check (public.is_admin());

grant execute on function public.save_bracket_picks(uuid, jsonb) to authenticated;
