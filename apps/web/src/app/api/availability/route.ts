import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Convert "HH:MM" to minutes from midnight */
function toMin(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convert minutes from midnight to "HH:MM" */
function toTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Extract minutes from midnight from an ISO string (local time) */
function isoToMin(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const barberId    = searchParams.get('barber_id');
  const date        = searchParams.get('date');       // YYYY-MM-DD
  const duration    = parseInt(searchParams.get('duration') ?? '30', 10);
  const stylistId   = searchParams.get('stylist_id');  // optional
  const stylistCount = searchParams.get('stylist_count') // optional integer

  if (!barberId || !date) {
    return NextResponse.json({ error: 'Missing barber_id or date' }, { status: 400 });
  }

  const supabase = createClient();

  // Fetch all non-cancelled appointments for this date
  const startOfDay = `${date}T00:00:00`;
  const endOfDay   = `${date}T23:59:59`;

  const useMultiStylist = !stylistId && stylistCount && parseInt(stylistCount, 10) > 1;
  const totalStylists   = useMultiStylist ? parseInt(stylistCount!, 10) : 0;

  let query = supabase
    .from('appointments')
    .select(useMultiStylist ? 'starts_at, ends_at, stylist_id' : 'starts_at, ends_at')
    .eq('barber_id', barberId)
    .gte('starts_at', startOfDay)
    .lte('starts_at', endOfDay)
    .not('status', 'in', '("cancelled","no_show")');

  if (stylistId) {
    // Show only this stylist's appointments
    query = query.eq('stylist_id', stylistId);
  }

  const { data: booked } = await query;

  // Working hours: 09:00 → 19:00, slots every 30 min
  const WORK_START = toMin('09:00');
  const WORK_END   = toMin('19:00');
  const INTERVAL   = 30;

  const slots: { time: string; available: boolean }[] = [];

  if (useMultiStylist) {
    // Multi-stylist mode: slot available if nb of conflicting stylists < totalStylists
    const appointments = (booked ?? []).map((a: { starts_at: string; ends_at: string; stylist_id?: string | null }) => ({
      start: isoToMin(a.starts_at),
      end:   isoToMin(a.ends_at),
      stylistId: a.stylist_id ?? null,
    }));

    for (let t = WORK_START; t + duration <= WORK_END; t += INTERVAL) {
      const slotEnd = t + duration;
      // Count distinct stylists with a conflict at this slot
      const conflictingStylistIds = new Set<string | null>();
      for (const appt of appointments) {
        if (t < appt.end && slotEnd > appt.start) {
          conflictingStylistIds.add(appt.stylistId);
        }
      }
      const conflictCount = conflictingStylistIds.size;
      slots.push({ time: toTime(t), available: conflictCount < totalStylists });
    }
  } else {
    // Single stylist or no-stylist mode: slot blocked if any appointment conflicts
    const occupied = (booked ?? []).map((a: { starts_at: string; ends_at: string }) => ({
      start: isoToMin(a.starts_at),
      end:   isoToMin(a.ends_at),
    }));

    for (let t = WORK_START; t + duration <= WORK_END; t += INTERVAL) {
      const slotEnd = t + duration;
      const blocked = occupied.some(o => t < o.end && slotEnd > o.start);
      slots.push({ time: toTime(t), available: !blocked });
    }
  }

  return NextResponse.json({ slots, date, stylist_id: stylistId ?? null });
}
