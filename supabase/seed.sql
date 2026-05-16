-- Demo seed data for local development.
-- Run after schema.sql + policies.sql.

insert into public.profiles (id, role, email, full_name, locale)
values
  ('00000000-0000-0000-0000-000000000001', 'barber',   'malik@bookedup.app', 'Malik Diallo', 'fr'),
  ('00000000-0000-0000-0000-000000000002', 'barber',   'samir@bookedup.app', 'Samir Bens',   'fr'),
  ('00000000-0000-0000-0000-000000000003', 'customer', 'leo@bookedup.app',   'Léo Martin',   'fr')
on conflict (id) do nothing;

insert into public.barbers (id, owner_id, slug, shop_name, bio, address, city, deposit_required, deposit_amount_cents, subscription_tier)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'malik-cuts', 'Malik Cuts', 'Fades nets, designs sur mesure, ambiance studio.',
   '12 rue de la République', 'Paris', true, 1000, 'pro'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'samir-studio', 'Samir Studio', 'Le spot de référence pour le low fade à Lyon.',
   '4 rue Mercière', 'Lyon', false, 0, 'free')
on conflict (id) do nothing;

insert into public.services (barber_id, name, duration_minutes, price_cents, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'Coupe classique',    30, 2500, 1),
  ('10000000-0000-0000-0000-000000000001', 'Fade + barbe',       45, 3500, 2),
  ('10000000-0000-0000-0000-000000000001', 'Design personnalisé',60, 5000, 3),
  ('10000000-0000-0000-0000-000000000002', 'Coupe homme',        30, 2200, 1),
  ('10000000-0000-0000-0000-000000000002', 'Taille de barbe',    20, 1500, 2);

insert into public.working_hours (barber_id, day_of_week, start_time, end_time) values
  ('10000000-0000-0000-0000-000000000001', 1, '09:00', '19:00'),
  ('10000000-0000-0000-0000-000000000001', 2, '09:00', '19:00'),
  ('10000000-0000-0000-0000-000000000001', 3, '09:00', '19:00'),
  ('10000000-0000-0000-0000-000000000001', 4, '09:00', '20:00'),
  ('10000000-0000-0000-0000-000000000001', 5, '09:00', '20:00'),
  ('10000000-0000-0000-0000-000000000001', 6, '10:00', '18:00');
