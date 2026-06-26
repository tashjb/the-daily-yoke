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

-- ── Row Level Security ─────────────────────────────────────
-- Users can only read and write their own rows.

alter table user_programs  enable row level security;
alter table training_data  enable row level security;

create policy "Own programs only"
  on user_programs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Own training data only"
  on training_data for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
