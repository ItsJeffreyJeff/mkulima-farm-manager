-- Run once in Supabase: SQL Editor > New query > Run  (after schema.sql and marketplace.sql)

-- Admins (seeded from the two admin emails; add more rows here later if needed)
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
insert into public.admins (user_id)
  select id from auth.users where lower(email) in ('jeffreyoduma@gmail.com', 'jeffoduma9@gmail.com')
  on conflict do nothing;
create or replace function public.is_admin() returns boolean language sql security definer stable set search_path = public
  as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text,
  category text not null default 'General',
  title text not null,
  body text,
  location text,
  created_at timestamptz not null default now()
);
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text,
  body text not null,
  is_admin boolean not null default false,
  is_expert boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists answers_question on public.answers (question_id, created_at);
create table if not exists public.experts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  profession text not null,
  location text not null,
  phone text not null,
  email text,
  bio text,
  latitude double precision,
  longitude double precision,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.experts enable row level security;

create policy "signed-in users read questions" on public.questions for select using (auth.uid() is not null);
create policy "ask as yourself" on public.questions for insert with check (user_id = auth.uid());
create policy "delete own or admin" on public.questions for delete using (user_id = auth.uid() or public.is_admin());

create policy "signed-in users read answers" on public.answers for select using (auth.uid() is not null);
create policy "answer as yourself" on public.answers for insert with check (user_id = auth.uid());
create policy "delete own or admin answers" on public.answers for delete using (user_id = auth.uid() or public.is_admin());

-- Admin and Expert badges on answers are set by the database, so they cannot be faked
create or replace function public.tag_answer() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.is_admin := exists (select 1 from public.admins where user_id = new.user_id);
  new.is_expert := exists (select 1 from public.experts where user_id = new.user_id and status = 'approved');
  return new;
end $$;
drop trigger if exists answers_tag on public.answers;
create trigger answers_tag before insert on public.answers for each row execute function public.tag_answer();

create policy "see approved experts, own profile, or all as admin" on public.experts for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "apply as yourself, pending only" on public.experts for insert with check (user_id = auth.uid() and status = 'pending');
create policy "edit own (back to pending) or admin" on public.experts for update using (user_id = auth.uid() or public.is_admin()) with check (public.is_admin() or (user_id = auth.uid() and status = 'pending'));
create policy "remove own or admin" on public.experts for delete using (user_id = auth.uid() or public.is_admin());

-- Live updates
do $$ begin alter publication supabase_realtime add table public.questions; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.answers; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.experts; exception when others then null; end $$;
