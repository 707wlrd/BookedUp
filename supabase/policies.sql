-- ╔══════════════════════════════════════════════════════════╗
-- ║  Row Level Security policies                            ║
-- ╚══════════════════════════════════════════════════════════╝

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

-- ─── Profiles ─────────────────────────────────────────────
create policy "profiles_self_read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);

-- ─── Barbers ──────────────────────────────────────────────
create policy "barbers_public_read"  on public.barbers for select using (true);
create policy "barbers_owner_write"  on public.barbers for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ─── Services / hours / time_off / portfolio (public read, owner write) ──
create policy "services_public_read" on public.services for select using (true);
create policy "services_owner_write" on public.services for all
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));

create policy "hours_public_read"    on public.working_hours for select using (true);
create policy "hours_owner_write"    on public.working_hours for all
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));

create policy "timeoff_owner_all"    on public.time_off for all
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));

create policy "portfolio_public_read" on public.portfolio_items for select using (true);
create policy "portfolio_owner_write" on public.portfolio_items for all
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));

-- ─── Appointments ─────────────────────────────────────────
create policy "appointments_customer_read" on public.appointments for select
  using (customer_id = auth.uid()
         or exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));

create policy "appointments_insert_public" on public.appointments for insert
  with check (customer_id is null or customer_id = auth.uid());

create policy "appointments_owner_update" on public.appointments for update
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid())
         or customer_id = auth.uid());

-- ─── Reviews ──────────────────────────────────────────────
create policy "reviews_public_read"  on public.reviews for select using (true);
create policy "reviews_customer_write" on public.reviews for insert
  with check (customer_id = auth.uid());
create policy "reviews_customer_update" on public.reviews for update
  using (customer_id = auth.uid());

-- ─── Push tokens ──────────────────────────────────────────
create policy "push_tokens_self" on public.push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── AI generations ───────────────────────────────────────
create policy "ai_owner_all" on public.ai_generations for all
  using (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.barbers b where b.id = barber_id and b.owner_id = auth.uid()));
