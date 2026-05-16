/**
 * POST /api/reminders
 *
 * Sends 24h-before reminder emails for all confirmed appointments starting
 * between tomorrow 00:00 and tomorrow 23:59 (UTC).
 *
 * Intended to be called once per day by a Vercel Cron (see vercel.json).
 * Protected by a shared secret: `Authorization: Bearer <CRON_SECRET>`.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendReminderEmail } from '@/lib/send-emails';
import { asRow, asRowOrNull, type BarberRow, type ServiceRow, type StylistRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** GET is called by Vercel Cron, POST can be called manually */
export async function GET(req: Request) { return handler(req); }
export async function POST(req: Request) { return handler(req); }

async function handler(req: Request) {
  // ── Auth check ─────────────────────────────────────────────────────────
  const auth = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  // ── Tomorrow's range (UTC) ─────────────────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const start = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 0, 0, 0));
  const end   = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 23, 59, 59));

  // ── Fetch appointments ─────────────────────────────────────────────────
  const { data: appts, error } = await supabase
    .from('appointments')
    .select(`
      id, starts_at, ends_at,
      customer_name, customer_email,
      price_cents, deposit_cents,
      services ( name, duration_minutes ),
      stylists ( name ),
      barbers  ( shop_name, city )
    `)
    .eq('status', 'confirmed')
    .gte('starts_at', start.toISOString())
    .lte('starts_at', end.toISOString());

  if (error) {
    console.error('[reminders] Supabase error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = appts ?? [];
  console.log(`[reminders] Sending ${list.length} reminder(s) for ${start.toISOString().slice(0, 10)}`);

  // ── Send reminders ─────────────────────────────────────────────────────
  const results = await Promise.allSettled(
    list.map(async (a) => {
      const service = asRow<ServiceRow>(a.services);
      const stylist = asRowOrNull<StylistRow>(a.stylists);
      const barber  = asRow<BarberRow>(a.barbers);

      await sendReminderEmail({
        customerName:    a.customer_name,
        customerEmail:   a.customer_email,
        shopName:        barber.shop_name ?? 'Le salon',
        city:            barber.city ?? null,
        serviceName:     service.name ?? 'Service',
        stylistName:     stylist?.name ?? null,
        startsAt:        a.starts_at,
        durationMinutes: service.duration_minutes ?? 30,
        priceCents:      a.price_cents,
        depositCents:    a.deposit_cents,
        appointmentId:   a.id,
      });

      return a.id;
    }),
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ sent, failed, total: list.length });
}
