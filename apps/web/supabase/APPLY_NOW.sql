-- ═══════════════════════════════════════════════════════════════════════════
-- BookedUp — Migrations manquantes à appliquer dans le SQL Editor Supabase
-- Copie-colle CE FICHIER ENTIER dans SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Colonnes manquantes sur barbers ────────────────────────────────────────
alter table public.barbers
  add column if not exists push_token text;

alter table public.barbers
  add column if not exists onboarding_completed boolean not null default false;

-- ── 2. Table stylists ─────────────────────────────────────────────────────────
create table if not exists public.stylists (
  id          uuid        primary key default gen_random_uuid(),
  barber_id   uuid        not null references public.barbers(id) on delete cascade,
  name        text        not null,
  bio         text,
  avatar_url  text,
  specialties text[]      default '{}',
  is_active   boolean     not null default true,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- stylist_id sur appointments
alter table public.appointments
  add column if not exists stylist_id uuid references public.stylists(id) on delete set null;

-- RLS stylists
alter table public.stylists enable row level security;

create policy "Public read active stylists"
  on public.stylists for select
  using (is_active = true);

create policy "Barbers manage their stylists"
  on public.stylists for all
  using (barber_id in (select id from public.barbers where owner_id = auth.uid()))
  with check (barber_id in (select id from public.barbers where owner_id = auth.uid()));

create index if not exists idx_stylists_barber_id on public.stylists(barber_id);
create index if not exists idx_appointments_stylist_id on public.appointments(stylist_id);

-- ── 3. Table recurring_series ─────────────────────────────────────────────────
create table if not exists public.recurring_series (
  id              uuid        primary key default gen_random_uuid(),
  barber_id       uuid        not null references public.barbers(id) on delete cascade,
  service_id      uuid        references public.services(id),
  customer_name   text        not null,
  customer_email  text        not null,
  frequency_weeks int         not null default 1,
  occurrences     int         not null default 4,
  created_at      timestamptz          default now()
);

alter table public.appointments
  add column if not exists recurring_series_id uuid
    references public.recurring_series(id) on delete set null;

-- ── 4. Table waitlist ─────────────────────────────────────────────────────────
create table if not exists public.waitlist (
  id              uuid        primary key default gen_random_uuid(),
  barber_id       uuid        not null references public.barbers(id) on delete cascade,
  service_id      uuid        references public.services(id) on delete set null,
  preferred_date  date        not null,
  customer_name   text        not null,
  customer_email  text        not null,
  customer_phone  text,
  notes           text,
  notified_at     timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.waitlist enable row level security;

create policy "waitlist_insert_anon"
  on public.waitlist for insert
  with check (true);

create index if not exists waitlist_barber_date_idx
  on public.waitlist (barber_id, preferred_date)
  where notified_at is null;

-- ── 5. Buckets Storage (si pas encore créés via le dashboard) ─────────────────
-- À faire manuellement dans Storage si les buckets n'existent pas encore :
-- → Bucket "avatars" (public)
-- → Bucket "covers"  (public)

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN — Vérifie qu'il n'y a pas d'erreur rouge en bas avant de continuer
-- ═══════════════════════════════════════════════════════════════════════════
