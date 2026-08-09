-- QuickMath friend mode schema.
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE semantics
-- where Postgres supports it for that object type.

create extension if not exists pgcrypto;

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  operation_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id text not null,       -- random id generated once per device, stored locally
  display_name text not null,
  rung_index int not null,       -- this player's current solo rung for the chosen operation
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, player_id)
);

create table if not exists room_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  question_index int not null,
  prompt text not null,
  correct_answer numeric not null,
  rung_index int not null,   -- host computes avg-of-both-players once per question and
                              -- stamps it here, so the guest never has to recompute it
                              -- from a possibly-incomplete realtime player list
  created_at timestamptz not null default now(),
  unique (room_id, question_index)
);

create table if not exists room_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  question_index int not null,
  player_id text not null,
  answer numeric,                -- null means "timed out with no answer"
  is_correct boolean not null,
  submitted_at timestamptz not null default now(),  -- server clock is the race referee
  unique (room_id, question_index, player_id)
);

-- Row Level Security. This app has no login system — every client connects
-- as the shared `anon` role — so these policies are intentionally open
-- *within these four tables only*. A stranger would need to guess a room's
-- UUID or 5-character code to touch it, same trust model as the code itself.
-- Nothing outside these four tables is exposed.
alter table rooms enable row level security;
alter table room_players enable row level security;
alter table room_questions enable row level security;
alter table room_answers enable row level security;

drop policy if exists "anon can read rooms" on rooms;
create policy "anon can read rooms" on rooms for select to anon, authenticated using (true);
drop policy if exists "anon can create rooms" on rooms;
create policy "anon can create rooms" on rooms for insert to anon, authenticated with check (true);

drop policy if exists "anon can read room_players" on room_players;
create policy "anon can read room_players" on room_players for select to anon, authenticated using (true);
drop policy if exists "anon can join rooms" on room_players;
create policy "anon can join rooms" on room_players for insert to anon, authenticated with check (true);

drop policy if exists "anon can read room_questions" on room_questions;
create policy "anon can read room_questions" on room_questions for select to anon, authenticated using (true);
drop policy if exists "anon can post room_questions" on room_questions;
create policy "anon can post room_questions" on room_questions for insert to anon, authenticated with check (true);

drop policy if exists "anon can read room_answers" on room_answers;
create policy "anon can read room_answers" on room_answers for select to anon, authenticated using (true);
drop policy if exists "anon can post room_answers" on room_answers;
create policy "anon can post room_answers" on room_answers for insert to anon, authenticated with check (true);

-- RLS only controls which ROWS are visible once a table is reachable — it
-- does NOT grant table-level access by itself. Depending on the project's
-- Data API settings, newly created tables aren't always auto-exposed to the
-- anon/authenticated roles, so grant it explicitly rather than assuming.
grant usage on schema public to anon, authenticated;
grant select, insert on rooms, room_players, room_questions, room_answers to anon, authenticated;

-- Realtime: let clients subscribe to INSERTs on these tables (free-tier Realtime).
alter publication supabase_realtime add table room_players;
alter publication supabase_realtime add table room_questions;
alter publication supabase_realtime add table room_answers;
