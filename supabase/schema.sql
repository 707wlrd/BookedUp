-- ╔══════════════════════════════════════════════════════════╗
-- ║  BookedUp — Database schema                             ║
-- ║  PostgreSQL 15+ / Supabase                              ║
-- ╚══════════════════════════════════════════════════════════╝

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ─── Enums ────────────────────────────────────────────────
create type user_role as enum ('customer', 'barber', 'admin');
create type appointment_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');
create type subscription_tier as enum ('free', 'pro', 'premium');
create type subscription_status as enum ('active', 'past_due', 'canceled', 'trialing', 'incomplete');

-- ─── Profiles (extends auth.users) ────────────────────────
create table public.profiles (
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

-- ─── Barbers (shops) ──────────────────────────────────────
create table public.barbers (
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

create index barbers_slug_idx on public.barbers(slug);
create index barbers_city_idx on public.barbers(city);

-- ─── Services ─────────────────────────────────────────────
create table public.services (
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

create index services_barber_idx on public.services(barber_id);

-- ─── Working hours ────────────────────────────────────────
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  is_closed boolean default false,
  unique (barber_id, day_of_week)
);

-- ─── Time off / blocked slots ─────────────────────────────
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);

-- ─── Appointments ─────────────────────────────────────────
create table public.appointments (
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

create index appointments_barber_starts_idx on public.appointments(barber_id, starts_at);
create index appointments_customer_idx on public.appointments(customer_id);
create index appointments_status_idx on public.appointments(status);

-- ─── Reviews ──────────────────────────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (appointment_id)
);

create index reviews_barber_idx on public.reviews(barber_id);

-- ─── Portfolio ────────────────────────────────────────────
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

-- ─── Push tokens (mobile) ─────────────────────────────────
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  unique (token)
);

-- ─── AI generations log ───────────────────────────────────
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  kind text not null check (kind in ('caption', 'story', 'reminder', 'available_slots')),
  prompt text,
  output text,
  created_at timestamptz not null default now()
);

-- ─── Rating trigger ───────────────────────────────────────
create or replace function public.refresh_barber_rating()
returns trigger language plpgsql as $$
begin
  update public.barbers b set
    rating_average = coalesce((select avg(rating)::numeric(3,2) from public.reviews where barber_id = b.id), 0),
    rating_count   = (select count(*) from public.reviews where barber_id = b.id)
  where b.id = coalesce(new.barber_id, old.barber_id);
  return null;
end;
$$;

create trigger reviews_rating_refresh
after insert or update or delete on public.reviews
for each row execute function public.refresh_barber_rating();

-- ─── updated_at trigger helper ────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger barbers_touch before update on public.barbers
  for each row execute function public.touch_updated_at();
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();
