-- Recurring series
create table if not exists public.recurring_series (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid references public.services(id),
  customer_name text not null,
  customer_email text not null,
  frequency_weeks int not null default 1,  -- 1=weekly, 2=biweekly, 4=monthly
  occurrences int not null default 4,
  created_at timestamptz default now()
);
alter table public.appointments
  add column if not exists recurring_series_id uuid references public.recurring_series(id) on delete set null;
