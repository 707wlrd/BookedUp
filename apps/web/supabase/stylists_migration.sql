-- ============================================================
-- Migration: Stylists (staff members per barber shop)
-- Run this in Supabase SQL editor after setup.sql
-- ============================================================

-- 1. Stylists table
create table if not exists public.stylists (
  id            uuid primary key default gen_random_uuid(),
  barber_id     uuid not null references public.barbers(id) on delete cascade,
  name          text not null,
  bio           text,
  avatar_url    text,
  specialties   text[] default '{}',
  is_active     boolean default true not null,
  sort_order    int default 0 not null,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- 2. updated_at trigger
create trigger stylists_updated_at
  before update on public.stylists
  for each row execute function public.set_updated_at();

-- 3. Add stylist_id to appointments (nullable — backward compat)
alter table public.appointments
  add column if not exists stylist_id uuid references public.stylists(id) on delete set null;

-- 4. RLS
alter table public.stylists enable row level security;

-- Barbers manage their own stylists
drop policy if exists "Barbers manage their stylists" on public.stylists;
create policy "Barbers manage their stylists"
  on public.stylists for all
  using (
    barber_id in (
      select id from public.barbers where owner_id = auth.uid()
    )
  )
  with check (
    barber_id in (
      select id from public.barbers where owner_id = auth.uid()
    )
  );

-- Anyone can read active stylists (for booking flow)
drop policy if exists "Public read active stylists" on public.stylists;
create policy "Public read active stylists"
  on public.stylists for select
  using (is_active = true);

-- 5. Index for performance
create index if not exists idx_stylists_barber_id on public.stylists(barber_id);
create index if not exists idx_appointments_stylist_id on public.appointments(stylist_id);
