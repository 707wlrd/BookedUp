-- Waitlist: customers who want to be notified if a slot opens up
create table if not exists public.waitlist (
  id              uuid        primary key default gen_random_uuid(),
  barber_id       uuid        not null references public.barbers(id)   on delete cascade,
  service_id      uuid        references public.services(id)            on delete set null,
  preferred_date  date        not null,
  customer_name   text        not null,
  customer_email  text        not null,
  customer_phone  text,
  notes           text,
  notified_at     timestamptz,                 -- set when the slot-open email is sent
  created_at      timestamptz not null default now()
);

create index if not exists waitlist_barber_date_idx
  on public.waitlist (barber_id, preferred_date)
  where notified_at is null;
