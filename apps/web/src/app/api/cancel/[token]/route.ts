/**
 * GET  /api/cancel/[token]  — fetch appointment info + cancellability check
 * POST /api/cancel/[token]  — cancel the appointment + send emails
 *
 * [token] = appointment UUID
 * Rules:
 *   - Only 'pending' or 'confirmed' appointments can be cancelled
 *   - Cannot cancel within 24h of the appointment start time
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendCancellationEmails, sendWaitlistNotification } from '@/lib/send-emails';
import { pushCancellation } from '@/lib/send-push';
import { asRow, type BarberRow, type ServiceRow } from '@/lib/types';

type Params = { params: { token: string } };

const HOURS_24 = 24 * 60 * 60 * 1000;

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET(_req: Request, { params }: Params) {
  const { token } = params;
  const supabase = createClient();

  const { data: appt, error } = await supabase
    .from('appointments')
    .select(`
      id, starts_at, status, price_cents, deposit_cents,
      customer_name, customer_email,
      services ( name ),
      barbers  ( shop_name, city )
    `)
    .eq('id', token)
    .single();

  if (error || !appt) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const service = asRow<ServiceRow>(appt.services);
  const barber  = asRow<BarberRow>(appt.barbers);

  const { date, time } = formatDatetime(appt.starts_at);
  const msUntil = new Date(appt.starts_at).getTime() - Date.now();

  // Already cancelled / completed / no-show
  if (!['pending', 'confirmed'].includes(appt.status)) {
    return NextResponse.json({
      shopName:    barber.shop_name ?? 'Le salon',
      serviceName: service.name    ?? 'Service',
      date, time,
      status:      appt.status,
      cancellable: false,
      reason:      appt.status === 'cancelled' ? 'already_cancelled' : 'not_cancellable',
    });
  }

  // Within 24h
  if (msUntil < HOURS_24) {
    return NextResponse.json({
      shopName:    barber.shop_name ?? 'Le salon',
      serviceName: service.name    ?? 'Service',
      date, time,
      status:      appt.status,
      cancellable: false,
      reason:      'too_late',
    });
  }

  return NextResponse.json({
    shopName:     barber.shop_name ?? 'Le salon',
    serviceName:  service.name    ?? 'Service',
    city:         barber.city     ?? null,
    date, time,
    status:       appt.status,
    depositCents: appt.deposit_cents ?? 0,
    cancellable:  true,
  });
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(_req: Request, { params }: Params) {
  const { token } = params;
  const supabase = createClient();

  // Fetch full appointment info
  const { data: appt, error } = await supabase
    .from('appointments')
    .select(`
      id, starts_at, status, deposit_cents,
      customer_name, customer_email,
      services ( name ),
      barbers  ( shop_name, push_token ),
      barber_id
    `)
    .eq('id', token)
    .single();

  if (error || !appt) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const service = asRow<ServiceRow>(appt.services);
  const barber  = asRow<BarberRow>(appt.barbers);

  // Guard: status
  if (!['pending', 'confirmed'].includes(appt.status)) {
    return NextResponse.json(
      { error: appt.status === 'cancelled' ? 'already_cancelled' : 'not_cancellable' },
      { status: 409 },
    );
  }

  // Guard: 24h rule
  const msUntil = new Date(appt.starts_at).getTime() - Date.now();
  if (msUntil < HOURS_24) {
    return NextResponse.json({ error: 'too_late' }, { status: 409 });
  }

  // Update status
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', token);

  if (updateError) {
    console.error('[cancel] Update error:', updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Fetch barber email for notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', appt.barber_id)
    .single();

  const { date, time } = formatDatetime(appt.starts_at);

  // Fire-and-forget: emails + push notification
  sendCancellationEmails({
    customerName:  appt.customer_name,
    customerEmail: appt.customer_email,
    shopName:      barber.shop_name ?? 'Le salon',
    serviceName:   service.name    ?? 'Service',
    startsAt:      appt.starts_at,
    depositCents:  appt.deposit_cents ?? 0,
    barberEmail:   profile?.email ?? '',
  }).catch(err => console.error('[cancel] Email error:', err));

  pushCancellation(barber.push_token, {
    customerName:  appt.customer_name,
    serviceName:   service.name ?? 'Service',
    date, time,
    appointmentId: appt.id,
  }).catch(() => {});

  // ── Waitlist: notify first person waiting for this barber on this date ────
  const cancelDate = new Date(appt.starts_at).toISOString().slice(0, 10);
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookedup.fr';

  void (async () => {
    try {
      const { data: waiting } = await supabase
        .from('waitlist')
        .select('id, customer_name, customer_email')
        .eq('barber_id', appt.barber_id)
        .eq('preferred_date', cancelDate)
        .is('notified_at', null)
        .order('created_at')
        .limit(1)
        .single();

      if (!waiting) return;

      await supabase.from('waitlist')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', waiting.id);

      await sendWaitlistNotification({
        customerName:  waiting.customer_name,
        customerEmail: waiting.customer_email,
        shopName:      barber.shop_name ?? 'Le salon',
        date,
        bookingUrl:    `${appUrl}/barbers/${appt.barber_id}`,
      });
    } catch (err) {
      console.error('[waitlist] notify error:', err);
    }
  })();

  return NextResponse.json({ ok: true });
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDatetime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}
