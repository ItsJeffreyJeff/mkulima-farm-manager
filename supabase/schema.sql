-- Run this once in Supabase: SQL Editor > New query > Run
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists records_user_kind on public.records (user_id, kind);
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email text, action text, section text, details text,
  created_at timestamptz not null default now()
);
create table if not exists public.reminder_logs (
  key text primary key,
  created_at timestamptz not null default now()
);
alter table public.records enable row level security;
alter table public.activity enable row level security;
alter table public.reminder_logs enable row level security;
create policy "own records" on public.records for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own activity insert" on public.activity for insert with check (user_id = auth.uid());
-- reminder_logs and admin views are accessed only by server functions (service role)
