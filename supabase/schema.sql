-- ==============================================================================
-- Re.Wise Spaced Repetition Platform - Supabase PostgreSQL Database Schema
-- Includes RLS policies, indexing, and auto-updating updated_at triggers
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Helper function for updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 2. User Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  is_pro boolean default false,
  target_exam text default 'NEET PG',
  target_exam_date text,
  daily_goal integer default 30,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create trigger tr_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create profile on auth.user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Decks Table
create table if not exists public.decks (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  category text default 'General',
  color text default '#6366F1',
  parent_id text references public.decks(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.decks enable row level security;

create policy "Users can manage own decks"
  on public.decks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger tr_decks_updated_at
  before update on public.decks
  for each row execute function public.handle_updated_at();

create index if not exists idx_decks_user_id on public.decks(user_id);

-- 4. Cards Table
create table if not exists public.cards (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  deck_id text references public.decks(id) on delete cascade not null,
  card_type text not null default 'basic',
  front text not null,
  back text not null,
  extra_context text,
  voice_note_url text,
  drawing_data_url text,
  tags text[] default '{}',
  due timestamptz default now(),
  stability real default 0,
  difficulty real default 0,
  elapsed_days real default 0,
  scheduled_days real default 0,
  reps integer default 0,
  lapses integer default 0,
  state integer default 0,
  last_review timestamptz,
  occlusion_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.cards enable row level security;

create policy "Users can manage own cards"
  on public.cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger tr_cards_updated_at
  before update on public.cards
  for each row execute function public.handle_updated_at();

create index if not exists idx_cards_user_id on public.cards(user_id);
create index if not exists idx_cards_deck_id on public.cards(deck_id);
create index if not exists idx_cards_due on public.cards(due);

-- 5. User Study Stats Table
create table if not exists public.user_stats (
  user_id uuid references auth.users on delete cascade primary key,
  total_reviews integer default 0,
  cards_learned integer default 0,
  current_streak integer default 0,
  best_streak integer default 0,
  retention_rate real default 0,
  last_study_date text,
  updated_at timestamptz default now()
);

alter table public.user_stats enable row level security;

create policy "Users can manage own study stats"
  on public.user_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger tr_user_stats_updated_at
  before update on public.user_stats
  for each row execute function public.handle_updated_at();

-- 6. Shared Decks (Public Web Previews & Community sharing)
create table if not exists public.shared_decks (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references auth.users on delete cascade not null,
  deck_id text not null,
  slug text unique not null,
  title text not null,
  description text,
  category text,
  card_count integer default 0,
  download_count integer default 0,
  is_public boolean default true,
  deck_snapshot jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.shared_decks enable row level security;

create policy "Public can view public shared decks"
  on public.shared_decks for select
  using (is_public = true or auth.uid() = author_id);

create policy "Authors can manage their shared decks"
  on public.shared_decks for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create index if not exists idx_shared_decks_slug on public.shared_decks(slug);

-- 7. Study Squads & Collaboration
create table if not exists public.squads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  code text unique not null,
  created_by uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.squads enable row level security;

create policy "Authenticated users can view squads"
  on public.squads for select
  to authenticated
  using (true);

create policy "Authenticated users can create squads"
  on public.squads for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Squad owners can update squads"
  on public.squads for update
  using (auth.uid() = created_by);

create table if not exists public.squad_members (
  id uuid default gen_random_uuid() primary key,
  squad_id uuid references public.squads(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text default 'member',
  joined_at timestamptz default now(),
  unique (squad_id, user_id)
);

alter table public.squad_members enable row level security;

create policy "Members can view squad membership"
  on public.squad_members for select
  to authenticated
  using (true);

create policy "Authenticated users can join squads"
  on public.squad_members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can leave squads"
  on public.squad_members for delete
  using (auth.uid() = user_id);

-- 8. AI Daily Quota & Usage Table (Server-side enforcement)
create table if not exists public.ai_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  usage_date date default current_date not null,
  count integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, usage_date)
);

alter table public.ai_usage enable row level security;

create policy "Users can view own AI usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

create policy "Users or Edge functions can update AI usage"
  on public.ai_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
