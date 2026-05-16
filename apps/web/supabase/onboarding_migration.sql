-- Track whether the barber has completed the onboarding flow
alter table public.barbers
  add column if not exists onboarding_completed boolean not null default false;
