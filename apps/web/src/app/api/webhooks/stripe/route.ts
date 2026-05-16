import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { sendDepositPaidEmails } from '@/lib/send-emails';
import { pushDepositPaid } from '@/lib/send-push';
import { asRow, asRowOrNull, type BarberWithProfile, type ServiceRow, type StylistRow } from '@/lib/types';
import type Stripe from 'stripe';

/** Disable body parsing — raw body required for Stripe signature verification */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature') ?? '';
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('[stripe webhook] STRIPE_WEBHOOK_SECRET not configured — skipping signature check');
  }

  let event: Stripe.Event;
  try {
    event = secret
      ? stripe.webhooks.constructEvent(body, sig, secret)
      : (JSON.parse(body) as Stripe.Event); // dev mode without secret
  } catch (err: any) {
    console.error('[stripe webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // ── Handle events ──────────────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { appointment_id, kind } = (session.metadata ?? {}) as {
      appointment_id?: string;
      kind?: string;
    };

    if (kind !== 'deposit' || !appointment_id) {
      return NextResponse.json({ received: true });
    }

    const supabase = createClient();

    // 1. Update appointment → confirmed + paid
    const { data: appt, error } = await supabase
      .from('appointments')
      .update({ status: 'confirmed', payment_status: 'paid' })
      .eq('id', appointment_id)
      .select(`
        *,
        services ( name, duration_minutes ),
        stylists ( name ),
        barbers  ( shop_name, city, owner_id, push_token,
                   profiles:owner_id ( email ) )
      `)
      .single();

    if (error || !appt) {
      console.error('[stripe webhook] Appointment update failed:', error?.message);
      return NextResponse.json({ error: 'appointment_not_found' }, { status: 404 });
    }

    // 2. Extract nested data safely
    const service  = asRow<ServiceRow>(appt.services);
    const stylist  = asRowOrNull<StylistRow>(appt.stylists);
    const barber   = asRow<BarberWithProfile>(appt.barbers);
    const barberEmail: string = barber.profiles?.email ?? '';

    // 3. Send emails + push notification (fire-and-forget)
    const { date, time } = (() => {
      const d = new Date(appt.starts_at);
      return {
        date: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
        time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
    })();

    pushDepositPaid(barber.push_token, {
      customerName:  appt.customer_name,
      serviceName:   service.name ?? 'Service',
      date, time,
      appointmentId: appt.id,
    }).catch(() => {});

    sendDepositPaidEmails({
      customerName:    appt.customer_name,
      customerEmail:   appt.customer_email,
      shopName:        barber.shop_name ?? 'Le salon',
      city:            barber.city ?? null,
      serviceName:     service.name ?? 'Service',
      stylistName:     stylist?.name ?? null,
      startsAt:        appt.starts_at,
      durationMinutes: service.duration_minutes ?? 30,
      priceCents:      appt.price_cents,
      depositCents:    appt.deposit_cents,
      appointmentId:   appt.id,
      barberEmail,
    }).catch(err => console.error('[email] send failed:', err));

  }

  return NextResponse.json({ received: true });
}
