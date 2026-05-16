-- ============================================================
-- Migration: Reviews system
-- Run in Supabase SQL editor
-- ============================================================

-- 1. Reviews table
create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  barber_id      uuid not null references public.barbers(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  customer_name  text not null,
  customer_email text not null,
  rating         int  not null check (rating between 1 and 5),
  comment        text,
  created_at     timestamptz default now() not null
);

-- 2. Track when review email was sent (add to appointments)
alter table public.appointments
  add column if not exists review_sent_at timestamptz;

-- 3. Indexes
create index if not exists idx_reviews_barber_id      on public.reviews(barber_id);
create index if not exists idx_reviews_appointment_id on public.reviews(appointment_id);

-- 4. RLS
alter table public.reviews enable row level security;

-- Anyone can read reviews
drop policy if exists "Public read reviews" on public.reviews;
create policy "Public read reviews"
  on public.reviews for select using (true);

-- Only unauthenticated inserts (customer review form — server-side via service role)
-- We'll insert via the API route using the service role key, so no user policy needed.
-- But add an authenticated fallback just in case:
drop policy if exists "Authenticated can insert reviews" on public.reviews;
create policy "Authenticated can insert reviews"
  on public.reviews for insert with check (true);

-- Barbers can delete reviews on their shop
drop policy if exists "Barbers delete own reviews" on public.reviews;
create policy "Barbers delete own reviews"
  on public.reviews for delete
  using (
    barber_id in (select id from public.barbers where owner_id = auth.uid())
  );

-- 5. Function: refresh barber rating stats
create or replace function public.refresh_barber_rating(p_barber_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.barbers
  set
    rating_average = coalesce((
      select round(avg(rating)::numeric, 1)
      from public.reviews
      where barber_id = p_barber_id
    ), 0),
    rating_count = (
      select count(*) from public.reviews where barber_id = p_barber_id
    )
  where id = p_barber_id;
end;
$$;

-- 6. Trigger: auto-refresh rating on insert/update/delete
create or replace function public.on_review_change()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_barber_rating(old.barber_id);
  else
    perform public.refresh_barber_rating(new.barber_id);
  end if;
  return null;
end;
$$;

drop trigger if exists reviews_rating_refresh on public.reviews;
create trigger reviews_rating_refresh
  after insert or update or delete on public.reviews
  for each row execute function public.on_review_change();
