-- ═══════════════════════════════════════════════════════════════════════════
-- BookedUp — Schéma complet v2
-- Remplace tout l'ancien schéma — colle et clique Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Nettoyage complet (ordre inverse des dépendances) ──────────────────
drop trigger if exists on_auth_user_created      on auth.users;
drop trigger if exists reviews_rating_refresh    on public.reviews;
drop trigger if exists appointments_updated_at   on public.appointments;
drop trigger if exists stylists_updated_at       on public.stylists;
drop trigger if exists barbers_updated_at        on public.barbers;
drop trigger if exists barbers_touch             on public.barbers;
drop trigger if exists profiles_touch            on public.profiles;
drop trigger if exists appointments_touch        on public.appointments;

drop function if exists public.handle_new_user()          cascade;
drop function if exists public.set_updated_at()           cascade;
drop function if exists public.touch_updated_at()         cascade;
drop function if exists public.refresh_barber_rating()    cascade;
drop function if exists public.refresh_barber_rating(uuid) cascade;
drop function if exists public.on_review_change()         cascade;

drop table if exists public.ai_generations    cascade;
drop table if exists public.waitlist          cascade;
drop table if exists public.reviews           cascade;
drop table if exists public.appointments      cascade;
drop table if exists public.recurring_series  cascade;
drop table if exists public.stylists          cascade;
drop table if exists public.services          cascade;
drop table if exists public.barbers           cascade;
drop table if exists public.profiles          cascade;
drop table if exists public.push_tokens       cascade;
drop table if exists public.portfolio_items   cascade;
drop table if exists public.working_hours     cascade;
drop table if exists public.time_off          cascade;

drop type if exists public.user_role           cascade;
drop type if exists public.appointment_status  cascade;
drop type if exists public.payment_status      cascade;
drop type if exists public.subscription_tier   cascade;
drop type if exists public.subscription_status cascade;

-- ── 1. Fonction updated_at ────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ── 2. profiles ───────────────────────────────────────────────────────────
create table public.profiles (
  id         uuid        primary key references auth.users on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  role       text        not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles_self_read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);

-- Auto-créer le profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3. barbers ────────────────────────────────────────────────────────────
create table public.barbers (
  id                     uuid        primary key default gen_random_uuid(),
  owner_id               uuid        not null references auth.users on delete cascade,
  shop_name              text        not null,
  slug                   text        unique,
  bio                    text,
  city                   text,
  address                text,
  country                text        default 'FR',
  latitude               numeric,
  longitude              numeric,
  avatar_url             text,
  cover_image_url        text,
  instagram_handle       text,
  opening_hours          jsonb,
  rating_average         numeric     not null default 0,
  rating_count           int         not null default 0,
  deposit_required       boolean     not null default false,
  deposit_amount_cents   int         not null default 0,
  push_token             text,
  onboarding_completed   boolean     not null default false,
  subscription_tier      text        not null default 'free',
  subscription_status    text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger barbers_updated_at
  before update on public.barbers
  for each row execute function public.set_updated_at();

alter table public.barbers enable row level security;
create policy "barbers_public_read" on public.barbers for select using (true);
create policy "barbers_owner_all"   on public.barbers for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index idx_barbers_slug     on public.barbers(slug);
create index idx_barbers_owner_id on public.barbers(owner_id);
create index idx_barbers_city     on public.barbers(city);

-- ── 4. services ───────────────────────────────────────────────────────────
create table public.services (
  id               uuid        primary key default gen_random_uuid(),
  barber_id        uuid        not null references public.barbers(id) on delete cascade,
  name             text        not null,
  description      text,
  duration_minutes int         not null default 30 check (duration_minutes > 0),
  price_cents      int         not null default 0   check (price_cents >= 0),
  is_active        boolean     not null default true,
  sort_order       int         not null default 0,
  created_at       timestamptz not null default now()
);

alter table public.services enable row level security;
create policy "services_public_read" on public.services for select using (true);
create policy "services_owner_all"   on public.services for all
  using  (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()));

create index idx_services_barber_id on public.services(barber_id);

-- ── 5. stylists ───────────────────────────────────────────────────────────
create table public.stylists (
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

create trigger stylists_updated_at
  before update on public.stylists
  for each row execute function public.set_updated_at();

alter table public.stylists enable row level security;
create policy "stylists_public_read" on public.stylists for select using (is_active = true);
create policy "stylists_owner_all"   on public.stylists for all
  using  (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()));

create index idx_stylists_barber_id on public.stylists(barber_id);

-- ── 6. recurring_series ───────────────────────────────────────────────────
create table public.recurring_series (
  id              uuid        primary key default gen_random_uuid(),
  barber_id       uuid        not null references public.barbers(id) on delete cascade,
  service_id      uuid        references public.services(id) on delete set null,
  customer_name   text        not null,
  customer_email  text        not null,
  frequency_weeks int         not null default 1,
  occurrences     int         not null default 4,
  created_at      timestamptz not null default now()
);

alter table public.recurring_series enable row level security;
create policy "recurring_owner_all" on public.recurring_series for all
  using  (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()));

-- ── 7. appointments ───────────────────────────────────────────────────────
create table public.appointments (
  id                       uuid        primary key default gen_random_uuid(),
  barber_id                uuid        not null references public.barbers(id) on delete cascade,
  customer_id              uuid        references auth.users on delete set null,
  service_id               uuid        references public.services(id) on delete set null,
  stylist_id               uuid        references public.stylists(id) on delete set null,
  recurring_series_id      uuid        references public.recurring_series(id) on delete set null,
  starts_at                timestamptz not null,
  ends_at                  timestamptz not null,
  status                   text        not null default 'pending'
                             check (status in ('pending','confirmed','cancelled','completed','no_show')),
  customer_name            text        not null,
  customer_email           text        not null,
  customer_phone           text,
  notes                    text,
  price_cents              int         not null default 0,
  deposit_cents            int         not null default 0,
  payment_status           text        not null default 'pending'
                             check (payment_status in ('pending','paid','refunded','failed')),
  stripe_payment_intent_id text,
  review_sent_at           timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (ends_at > starts_at)
);

create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;
create policy "appointments_public_insert" on public.appointments for insert with check (true);
create policy "appointments_read"          on public.appointments for select
  using (customer_id = auth.uid()
      or exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()));
create policy "appointments_owner_update"  on public.appointments for update
  using (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid())
      or customer_id = auth.uid());

create index idx_appointments_barber_id   on public.appointments(barber_id);
create index idx_appointments_customer_id on public.appointments(customer_id);
create index idx_appointments_starts_at   on public.appointments(starts_at);
create index idx_appointments_status      on public.appointments(status);
create index idx_appointments_stylist_id  on public.appointments(stylist_id);

-- ── 8. reviews ────────────────────────────────────────────────────────────
-- customer_id est nullable → avis anonymes (lien email après RDV)
create table public.reviews (
  id             uuid        primary key default gen_random_uuid(),
  barber_id      uuid        not null references public.barbers(id) on delete cascade,
  appointment_id uuid        references public.appointments(id) on delete set null,
  customer_id    uuid        references auth.users on delete set null,
  customer_name  text        not null,
  customer_email text        not null,
  rating         int         not null check (rating between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now()
);

alter table public.reviews enable row level security;
create policy "reviews_public_read"   on public.reviews for select using (true);
create policy "reviews_anyone_insert" on public.reviews for insert with check (true);
create policy "reviews_owner_delete"  on public.reviews for delete
  using (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()));

create index idx_reviews_barber_id      on public.reviews(barber_id);
create index idx_reviews_appointment_id on public.reviews(appointment_id);

-- Auto-mettre à jour la note moyenne du barber
create or replace function public.refresh_barber_rating()
returns trigger language plpgsql security definer as $$
declare v_barber_id uuid;
begin
  v_barber_id := coalesce(new.barber_id, old.barber_id);
  update public.barbers set
    rating_average = coalesce((
      select round(avg(rating)::numeric, 1)
      from public.reviews where barber_id = v_barber_id
    ), 0),
    rating_count = (
      select count(*) from public.reviews where barber_id = v_barber_id
    )
  where id = v_barber_id;
  return null;
end;
$$;

create trigger reviews_rating_refresh
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_barber_rating();

-- ── 9. waitlist ───────────────────────────────────────────────────────────
create table public.waitlist (
  id             uuid        primary key default gen_random_uuid(),
  barber_id      uuid        not null references public.barbers(id) on delete cascade,
  service_id     uuid        references public.services(id) on delete set null,
  preferred_date date        not null,
  customer_name  text        not null,
  customer_email text        not null,
  customer_phone text,
  notes          text,
  notified_at    timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.waitlist enable row level security;
create policy "waitlist_public_insert" on public.waitlist for insert with check (true);
create policy "waitlist_owner_read"    on public.waitlist for select
  using (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()));
create policy "waitlist_owner_update"  on public.waitlist for update
  using (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()));

create index idx_waitlist_barber_date
  on public.waitlist(barber_id, preferred_date)
  where notified_at is null;

-- ── 10. ai_generations ────────────────────────────────────────────────────
create table public.ai_generations (
  id         uuid        primary key default gen_random_uuid(),
  barber_id  uuid        references public.barbers(id) on delete cascade,
  kind       text,
  prompt     text,
  output     text,
  created_at timestamptz not null default now()
);

alter table public.ai_generations enable row level security;
create policy "ai_owner_all" on public.ai_generations for all
  using  (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers where id = barber_id and owner_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
select 'BookedUp schema v2 installé avec succès 🎉' as status;
-- ═══════════════════════════════════════════════════════════════════════════
