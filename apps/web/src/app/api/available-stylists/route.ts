import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Convert "HH:MM" to minutes from midnight */
function toMin(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Extract minutes from midnight from an ISO string (local time) */
function isoToMin(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * GET /api/available-stylists
 * Query params:
 *   barber_id  - required
 *   date       - required, YYYY-MM-DD
 *   time       - required, HH:MM
 *   duration   - required, integer (minutes)
 *   stylist_ids - required, comma-separated list of stylist IDs to check
 *
 * Returns { available: string[] } — the IDs of stylists free at that slot.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const barberId   = searchParams.get('barber_id');
  const date       = searchParams.get('date');       // YYYY-MM-DD
  const time       = searchParams.get('time');       // HH:MM
  const duration   = parseInt(searchParams.get('duration') ?? '30', 10);
  const stylistIdsParam = searchParams.get('stylist_ids'); // "id1,id2,id3"

  if (!barberId || !date || !time || !stylistIdsParam) {
    return NextResponse.json(
      { error: 'Missing barber_id, date, time, or stylist_ids' },
      { status: 400 },
    );
  }

  const stylistIds = stylistIdsParam.split(',').map(s => s.trim()).filter(Boolean);
  if (stylistIds.length === 0) {
    return NextResponse.json({ available: [] });
  }

  const slotStart = toMin(time);
  const slotEnd   = slotStart + duration;

  const supabase = createClient();

  const startOfDay = `${date}T00:00:00`;
  const endOfDay   = `${date}T23:59:59`;

  // Fetch appointments for this barber/date that involve the given stylists
  const { data: booked } = await supabase
    .from('appointments')
    .select('starts_at, ends_at, stylist_id')
    .eq('barber_id', barberId)
    .gte('starts_at', startOfDay)
    .lte('starts_at', endOfDay)
    .in('stylist_id', stylistIds)
    .not('status', 'in', '("cancelled","no_show")');

  // Build set of stylist IDs that have a conflict with [slotStart, slotEnd)
  const conflictingIds = new Set<string>();
  for (const appt of booked ?? []) {
    if (!appt.stylist_id) continue;
    const aStart = isoToMin(appt.starts_at);
    const aEnd   = isoToMin(appt.ends_at);
    if (slotStart < aEnd && slotEnd > aStart) {
      conflictingIds.add(appt.stylist_id);
    }
  }

  // Available = requested stylists minus those with conflicts
  const available = stylistIds.filter(id => !conflictingIds.has(id));

  return NextResponse.json({ available });
}
