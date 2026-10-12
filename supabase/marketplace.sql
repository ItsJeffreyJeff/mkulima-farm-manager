-- Run once in Supabase: SQL Editor > New query > Run  (after schema.sql)
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  seller_name text,
  title text not null,
  category text not null default 'Animals',
  description text,
  location text,
  price numeric not null,
  unit text not null default 'per head',
  quantity integer not null default 1,
  contact_phone text not null,
  photos text[] not null default '{}',
  fee_amount numeric,
  payment_ref text not null,
  status text not null default 'pending' check (status in ('pending','live','rejected','sold')),
  reject_reason text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists listings_status on public.listings (status, created_at desc);
-- one M-Pesa code can only pay for one (non-rejected) listing
create unique index if not exists listings_payment_ref_uniq on public.listings (upper(payment_ref)) where status <> 'rejected';

alter table public.listings enable row level security;
create policy "see live and own listings" on public.listings for select using (status = 'live' or user_id = auth.uid());
create policy "farmers submit pending listings" on public.listings for insert with check (user_id = auth.uid() and status = 'pending');
-- farmers can only move their own listing to pending (edit and resubmit) or sold; only admins can make it live
create policy "farmers edit own listings" on public.listings for update using (user_id = auth.uid()) with check (user_id = auth.uid() and status in ('pending','sold'));
create policy "farmers delete own listings" on public.listings for delete using (user_id = auth.uid());

-- Photo storage
insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true) on conflict (id) do nothing;
create policy "public can view listing photos" on storage.objects for select using (bucket_id = 'listing-photos');
create policy "farmers upload to own folder" on storage.objects for insert to authenticated with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "farmers delete own photos" on storage.objects for delete to authenticated using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
