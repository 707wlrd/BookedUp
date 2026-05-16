/**
 * GET /api/review-requests
 *
 * Finds all appointments completed yesterday and not yet review-emailed,
 * then sends a review request email for each.
 *
 * Called daily at 12:00 by Vercel Cron (see vercel.json).
 * Protected by Authorization: Bearer <CRON_SECRET>.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendReviewRequestEmail } from '@/lib/send-emails';
import { asRow, type BarberRow, type ServiceRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) { return handler(req); }
export async function POST(req: Request) { return handler(req); }

async function handler(req: Request) {
  // ── Auth ───────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient();

  // ── Yesterday UTC range ────────────────────────────────────────────────
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const start = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 0, 0, 0));
  const end   = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 23, 59, 59));

  // ── Fetch eligible appointments ────────────────────────────────────────
  const { data: appts, error } = await supabase
    .from('appointments')
    .select(`
      id, starts_at, customer_name, customer_email, review_sent_at,
      services ( name ),
      barbers  ( shop_name, city )
    `)
    .eq('status', 'completed')
    .gte('starts_at', start.toISOString())
    .lte('starts_at', end.toISOString())
    .is('review_sent_at', null);   // not yet emailed

  if (error) {
    console.error('[review-requests] Supabase error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = appts ?? [];
  console.log(`[review-requests] Processing ${list.length} appointment(s) for ${start.toISOString().slice(0, 10)}`);

  // ── Send + mark ────────────────────────────────────────────────────────
  const results = await Promise.allSettled(
    list.map(async (a) => {
      const service = asRow<ServiceRow>(a.services);
      const barber  = asRow<BarberRow>(a.barbers);

      await sendReviewRequestEmail({
        customerName:  a.customer_name,
        customerEmail: a.customer_email,
        shopName:      barber.shop_name ?? 'Le salon',
        serviceName:   service.name ?? 'Votre service',
        startsAt:      a.starts_at,
        appointmentId: a.id,
      });

      // Mark as sent (so we don't send twice even if cron runs again)
      await supabase
        .from('appointments')
        .update({ review_sent_at: new Date().toISOString() })
        .eq('id', a.id);

      return a.id;
    }),
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  results.filter(r => r.status === 'rejected').forEach((r: any) =>
    console.error('[review-requests] Failed:', r.reason),
  );

  return NextResponse.json({ sent, failed, total: list.length });
}
