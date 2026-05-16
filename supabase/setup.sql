-- ╔══════════════════════════════════════════════════════════╗
-- ║  BookedUp — Full setup (schema + RLS + auth trigger)    ║
-- ║  Colle ce fichier dans Supabase SQL Editor et clique Run║
-- ╚══════════════════════════════════════════════════════════╝

-- ─── Extensions ───────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ─── Enums ────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('customer', 'barber', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_tier as enum ('free', 'pro', 'premium');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'past_due', 'canceled', 'trialing', 'incomplete');
exception when duplicate_object then null; end $$;

-- ─── Profiles ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  email text unique not null,
  full_name text,
  phone text,
  avatar_url text,
  locale text default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Barbers ──────────────────────────────────────────────
create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text unique not null,
  shop_name text not null,
  bio text,
  address text,
  city text,
  country text default 'FR',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  cover_image_url text,
  avatar_url text,
  instagram_handle text,
  rating_average numeric(3, 2) default 0,
  rating_count int default 0,
  deposit_required boolean default false,
  deposit_amount_cents int default 0,
  subscription_tier subscription_tier default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status subscription_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists barbers_slug_idx on public.barbers(slug);
create index if not exists barbers_city_idx on public.barbers(city);

-- ─── Services ─────────────────────────────────────────────
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents int not null check (price_cents >= 0),
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create index if not exists services_barber_idx on public.services(barber_id);

-- ─── Working hours ────────────────────────────────────────
create table if not exists public.working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_closed boolean default false,
  unique (barber_id, day_of_week)
);

-- ─── Time off ─────────────────────────────────────────────
create table if not exists public.time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);

-- ─── Appointments ─────────────────────────────────────────
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'pending',
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  notes text,
  price_cents int not null,
  deposit_cents int default 0,
  payment_status payment_status default 'pending',
  stripe_payment_intent_id text,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists appointments_barber_starts_idx on public.appointments(barber_id, starts_at);
create index if not exists appointments_customer_idx on public.appointments(customer_id);
create index if not exists appointments_status_idx on public.appointments(status);

-- ─── Reviews ──────────────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (appointment_id)
);

create index if not exists reviews_barber_idx on public.reviews(barber_id);

-- ─── Portfolio ────────────────────────────────────────────
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

-- ─── Push tokens ──────────────────────────────────────────
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  unique (token)
);

-- ─── AI generations ───────────────────────────────────────
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  kind text not null check (kind in ('caption', 'story', 'reminder', 'available_slots')),
  prompt text,
  output text,
  created_at timestamptz not null default now()
);

-- ─── Triggers : updated_at ────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch     on public.profiles;
drop trigger if exists barbers_touch      on public.barbers;
drop trigger if exists appointments_touch on public.appointments;

create trigger profiles_touch     before update on public.profiles     for each row execute function public.touch_updated_at();
create trigger barbers_touch      before update on public.barbers      for each row execute function public.touch_updated_at();
create trigger appointments_touch before update on public.appointments for each row execute function public.touch_updated_at();

-- ─── Trigger : rating barber ──────────────────────────────
create or replace function public.refresh_barber_rating()
returns trigger language plpgsql as $$
begin
  update public.barbers b set
    rating_average = coalesce((select avg(rating)::numeric(3,2) from public.reviews where barber_id = b.id), 0),
    rating_count   = (select count(*) from public.reviews where barber_id = b.id)
  where b.id = coalesce(new.barber_id, old.barber_id);
  return null;
end; $$;

drop trigger if exists reviews_rating_refresh on public.reviews;
create trigger reviews_rating_refresh
after insert or update or delete on public.reviews
for each row execute function public.refresh_barber_rating();

-- ─── Trigger : auto-créer un profil à l'inscription ──────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ─── Row Level Security ───────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.barbers         enable row level security;
alter table public.services        enable row level security;
alter table public.working_hours   enable row level security;
alter table public.time_off        enable row level security;
alter table public.appointments    enable row level security;
alter table public.reviews         enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.push_tokens     enable row level security;
alter table public.ai_generations  enable row level security;

-- Profiles
drop policy if exists "profiles_self_read"   on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_self_read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);

-- Barbers
drop policy if exists "barbers_public_read" on public.barbers;
drop policy if exists "barbers_owner_write" on public.barbers;
create policy "barbers_public_read" on public.barbers for select using (true);
create policy "barbers_owner_write" on public.barbers for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Services
drop policy if exists "services_public_read" on public.services;
drop policy if exists "services_owner_write" on public.services;
create policy "services_public_read" on public.services for select using (true);
create policy "services_owner_write" on public.services for all
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));

-- Working hours
drop policy if exists "hours_public_read" on public.working_hours;
drop policy if exists "hours_owner_write" on public.working_hours;
create policy "hours_public_read" on public.working_hours for select using (true);
create policy "hours_owner_write" on public.working_hours for all
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));

-- Time off
drop policy if exists "timeoff_owner_all" on public.time_off;
create policy "timeoff_owner_all" on public.time_off for all
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));

-- Portfolio
drop policy if exists "portfolio_public_read" on public.portfolio_items;
drop policy if exists "portfolio_owner_write" on public.portfolio_items;
create policy "portfolio_public_read" on public.portfolio_items for select using (true);
create policy "portfolio_owner_write" on public.portfolio_items for all
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));

-- Appointments
drop policy if exists "appointments_customer_read"  on public.appointments;
drop policy if exists "appointments_insert_public"  on public.appointments;
drop policy if exists "appointments_owner_update"   on public.appointments;
create policy "appointments_customer_read" on public.appointments for select
  using (customer_id = auth.uid()
         or exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));
create policy "appointments_insert_public" on public.appointments for insert
  with check (customer_id is null or customer_id = auth.uid());
create policy "appointments_owner_update" on public.appointments for update
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid())
         or customer_id = auth.uid());

-- Reviews
drop policy if exists "reviews_public_read"     on public.reviews;
drop policy if exists "reviews_customer_write"  on public.reviews;
drop policy if exists "reviews_customer_update" on public.reviews;
create policy "reviews_public_read"     on public.reviews for select using (true);
create policy "reviews_customer_write"  on public.reviews for insert with check (customer_id = auth.uid());
create policy "reviews_customer_update" on public.reviews for update using (customer_id = auth.uid());

-- Push tokens
drop policy if exists "push_tokens_self" on public.push_tokens;
create policy "push_tokens_self" on public.push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- AI generations
drop policy if exists "ai_owner_all" on public.ai_generations;
create policy "ai_owner_all" on public.ai_generations for all
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));

-- ✅ Setup terminé !
select 'BookedUp schema installed successfully 🎉' as status;
