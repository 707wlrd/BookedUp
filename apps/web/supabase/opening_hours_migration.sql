-- Add opening_hours JSONB column to barbers table
-- Format: { "lundi": { "open": true, "from": "09:00", "to": "18:00" }, ... }

ALTER TABLE barbers
  ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT NULL;
