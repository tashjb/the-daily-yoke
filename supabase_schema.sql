-- ============================================================
-- Training Tracker — Supabase Schema
-- Paste this into: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. User programmes (workout structure per user)
create table if not exists user_programs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null unique,
  name        text not null default 'My Programme',
  program     jsonb not null default '[]'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. Training data (logs, PBs, completions — stored as a single JSON blob per user)
create table if not exists training_data (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null unique,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

-- 3. Profiles (role management — 'user' or 'coach')
create table if not exists profiles (
  user_id     uuid primary key references auth.users on delete cascade,
  email       text,
  role        text not null default 'user' check (role in ('user', 'coach')),
  created_at  timestamptz default now()
);

-- ── Row Level Security ─────────────────────────────────────

alter table user_programs  enable row level security;
alter table training_data  enable row level security;
alter table profiles       enable row level security;

-- Security-definer helper — lets other policies check coach status
-- without causing infinite recursion on the profiles table itself.
create or replace function is_coach()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select role = 'coach' from profiles where user_id = auth.uid()),
    false
  );
$$;

-- ── profiles policies ──────────────────────────────────────
-- Everyone reads their own row; coaches read all rows.
create policy "profiles_select"
  on profiles for select
  using (auth.uid() = user_id or is_coach());

-- Anyone can insert their own profile row (on sign-up).
create policy "profiles_insert"
  on profiles for insert
  with check (auth.uid() = user_id);

-- Users can update their own profile (but cannot change their own role).
create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── user_programs policies ─────────────────────────────────
-- Users manage their own row; coaches can read all rows.
create policy "programs_own"
  on user_programs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "programs_coach_read"
  on user_programs for select
  using (is_coach());

-- ── training_data policies ─────────────────────────────────
-- Users manage their own row; coaches can read all rows.
create policy "training_own"
  on training_data for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "training_coach_read"
  on training_data for select
  using (is_coach());
