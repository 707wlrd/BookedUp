-- Add push_token column to barbers for Expo Push Notifications
alter table public.barbers
  add column if not exists push_token text;

-- Optional index for quick lookup (rarely queried, low cardinality — not strictly needed)
-- create index if not exists barbers_push_token_idx on public.barbers (push_token);
