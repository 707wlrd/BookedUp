/**
 * Shared TypeScript interfaces for Supabase query results.
 * Use these instead of `as any` when dealing with joined tables.
 */

// ── Joined sub-types (from Supabase relational selects) ───────────────────────

export interface ServiceRow {
  name:             string;
  duration_minutes: number;
  price_cents?:     number;
}

export interface BarberRow {
  id?:          string;
  shop_name:    string;
  city?:        string | null;
  push_token?:  string | null;
  owner_id?:    string;
}

export interface BarberWithProfile extends BarberRow {
  profiles?: { email: string } | null;
}

export interface StylistRow {
  name: string;
}

// ── Generic helper ─────────────────────────────────────────────────────────────

/**
 * Cast a Supabase join result to a typed object with a fallback.
 * Replaces `(row.relation as any) ?? {}`.
 *
 * @example
 * const service = asRow<ServiceRow>(appt.services);
 */
export function asRow<T extends object>(value: unknown): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T;
  }
  return {} as T;
}

export function asRowOrNull<T extends object>(value: unknown): T | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T;
  }
  return null;
}
