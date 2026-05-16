-- ─────────────────────────────────────────────────────────────────────────────
-- BookedUp — Migration consolidée
-- Appliquer une seule fois sur un projet Supabase vierge (ordre important).
-- Sur un projet existant, appliquer chaque fichier individuel dans /supabase/.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. push_token ─────────────────────────────────────────────────────────────
alter table public.barbers
  add column if not exists push_token text;

-- ── 2. onboarding_completed ───────────────────────────────────────────────────
alter table public.barbers
  add column if not exists onboarding_completed boolean not null default false;

-- ── 3. recurring_series ───────────────────────────────────────────────────────
create table if not exists public.recurring_series (
  id              uuid        primary key default gen_random_uuid(),
  barber_id       uuid        not null references public.barbers(id)  on delete cascade,
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

-- ── 4. waitlist ───────────────────────────────────────────────────────────────
create table if not exists public.waitlist (
  id              uuid        primary key default gen_random_uuid(),
  barber_id       uuid        not null references public.barbers(id)  on delete cascade,
  service_id      uuid        references public.services(id)          on delete set null,
  preferred_date  date        not null,
  customer_name   text        not null,
  customer_email  text        not null,
  customer_phone  text,
  notes           text,
  notified_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists waitlist_barber_date_idx
  on public.waitlist (barber_id, preferred_date)
  where notified_at is null;

-- ── 5. Supabase Storage buckets (run via Dashboard > Storage or SQL Editor) ───
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('covers',  'covers',  true) on conflict do nothing;

-- ── 6. RLS policies (minimal — adapt to your security requirements) ───────────
-- Waitlist: anyone can insert, only service role can read/update
alter table public.waitlist enable row level security;

create policy if not exists "waitlist_insert_anon"
  on public.waitlist for insert
  with check (true);

-- Recurring series: only the owning barber can read
alter table public.recurring_series enable row level security;

create policy if not exists "recurring_series_owner_select"
  on public.recurring_series for select
  using (
    barber_id in (
      select id from public.barbers where owner_id = auth.uid()
    )
  );
