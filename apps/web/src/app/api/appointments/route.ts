import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { sendConfirmedEmails } from '@/lib/send-emails';
import { pushNewBooking } from '@/lib/send-push';
import { rateLimit } from '@/lib/rate-limit';
import { type BarberRow } from '@/lib/types';

const Body = z.object({
  barber_id:    z.string().uuid(),
  service_id:   z.string().min(1),
  stylist_id:   z.string().uuid().optional().nullable(),
  starts_at:    z.string().datetime(),
  ends_at:      z.string().datetime(),
  customer_name:  z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().optional(),
  notes:          z.string().optional(),
  recurring_weeks: z.number().int().min(1).max(4).optional().nullable(),
  recurring_count: z.number().int().min(2).max(12).optional().nullable(),
});

export async function POST(req: Request) {
  // ── Rate limiting: 5 bookings / minute per IP ──────────────────────────
  const rl = rateLimit(req, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de réservations. Réessayez dans une minute.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = createClient();          // anon — pour auth user
  const adminDb = createServiceClient();    // service role — pour inserts publics

  // ── Fetch service ──────────────────────────────────────────────────────
  const { data: service } = await supabase
    .from('services')
    .select('id, price_cents, name, duration_minutes, barber_id')
    .eq('id', input.service_id)
    .single();
  if (!service || service.barber_id !== input.barber_id) {
    return NextResponse.json({ error: 'service_not_found' }, { status: 404 });
  }

  // ── Fetch barber (+ owner email for notifications) ────────────────────
  const { data: barber } = await supabase
    .from('barbers')
    .select('id, shop_name, city, owner_id, deposit_required, deposit_amount_cents, push_token')
    .eq('id', input.barber_id)
    .single();
  if (!barber) {
    return NextResponse.json({ error: 'barber_not_found' }, { status: 404 });
  }

  // ── Fetch barber owner email ───────────────────────────────────────────
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', barber.owner_id)
    .single();

  // ── Fetch stylist if provided ──────────────────────────────────────────
  let stylistName: string | null = null;
  if (input.stylist_id) {
    const { data: stylist } = await supabase
      .from('stylists')
      .select('name')
      .eq('id', input.stylist_id)
      .single();
    stylistName = stylist?.name ?? null;
  }

  // ── Auth (optional — guests can book) ─────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();

  // ── Create appointment (service role — bypass RLS for public booking) ──
  const { data: appt, error } = await adminDb
    .from('appointments')
    .insert({
      barber_id:      input.barber_id,
      customer_id:    user?.id ?? null,
      service_id:     input.service_id,
      stylist_id:     input.stylist_id ?? null,
      starts_at:      input.starts_at,
      ends_at:        input.ends_at,
      status:         barber.deposit_required ? 'pending' : 'confirmed',
      customer_name:  input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone ?? null,
      notes:          input.notes ?? null,
      price_cents:    service.price_cents,
      deposit_cents:  barber.deposit_required ? barber.deposit_amount_cents : 0,
      payment_status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Build shared email payload ─────────────────────────────────────────
  const emailData = {
    customerName:    input.customer_name,
    customerEmail:   input.customer_email,
    shopName:        barber.shop_name,
    city:            barber.city ?? null,
    serviceName:     service.name,
    stylistName,
    startsAt:        input.starts_at,
    durationMinutes: service.duration_minutes,
    priceCents:      service.price_cents,
    depositCents:    barber.deposit_required ? barber.deposit_amount_cents : 0,
    appointmentId:   appt.id,
    barberEmail:     ownerProfile?.email ?? '',
  };

  // ── Deposit required → Stripe Checkout ────────────────────────────────
  if (
    barber.deposit_required &&
    barber.deposit_amount_cents > 0 &&
    process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes('xxx')
  ) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: input.customer_email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: barber.deposit_amount_cents,
              product_data: {
                name: `Acompte — ${service.name} chez ${barber.shop_name}`,
                description: `RDV le ${new Date(input.starts_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}`,
              },
            },
          },
        ],
        metadata: { appointment_id: appt.id, kind: 'deposit' },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/success?id=${appt.id}`,
        cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/barbers`,
      });
      // Emails will be sent by the Stripe webhook after payment
      return NextResponse.json({ appointment_id: appt.id, checkout_url: session.url });
    } catch (e: any) {
      console.error('Stripe error:', e.message);
      // Fall through — appointment created, emails sent below
    }
  }

  // ── Recurring series ───────────────────────────────────────────────────
  let seriesId: string | null = null;
  let totalCreated = 1;

  if (input.recurring_weeks && input.recurring_count && input.recurring_count >= 2) {
    // 1. Create the recurring_series record
    const { data: series, error: seriesErr } = await adminDb
      .from('recurring_series')
      .insert({
        barber_id:       input.barber_id,
        service_id:      input.service_id,
        customer_name:   input.customer_name,
        customer_email:  input.customer_email,
        frequency_weeks: input.recurring_weeks,
        occurrences:     input.recurring_count,
      })
      .select('id')
      .single();

    if (!seriesErr && series) {
      seriesId = series.id;
      const weeksMs = input.recurring_weeks * 7 * 24 * 60 * 60 * 1000;
      const durationMs = service.duration_minutes * 60_000;

      // 2. Attach series_id to the first appointment
      await adminDb
        .from('appointments')
        .update({ recurring_series_id: seriesId })
        .eq('id', appt.id);

      // 3. Create N-1 future occurrences
      const futureAppts = [];
      for (let i = 1; i < input.recurring_count; i++) {
        const startsAt = new Date(new Date(input.starts_at).getTime() + i * weeksMs);
        const endsAt   = new Date(startsAt.getTime() + durationMs);
        futureAppts.push({
          barber_id:           input.barber_id,
          customer_id:         user?.id ?? null,
          service_id:          input.service_id,
          stylist_id:          input.stylist_id ?? null,
          starts_at:           startsAt.toISOString(),
          ends_at:             endsAt.toISOString(),
          status:              'confirmed' as const,
          customer_name:       input.customer_name,
          customer_email:      input.customer_email,
          customer_phone:      input.customer_phone ?? null,
          notes:               input.notes ?? null,
          price_cents:         service.price_cents,
          deposit_cents:       0,
          payment_status:      'pending',
          recurring_series_id: seriesId,
        });
      }

      if (futureAppts.length > 0) {
        const { data: inserted } = await adminDb
          .from('appointments')
          .insert(futureAppts)
          .select('id');
        totalCreated = 1 + (inserted?.length ?? 0);
      }
    }
  }

  // ── No deposit (or Stripe not configured) → immediate confirmation ─────
  const { date, time } = formatDatetime(input.starts_at);

  // Fire-and-forget: emails + push notification (only for first appointment)
  sendConfirmedEmails(emailData).catch(err =>
    console.error('[email] Failed to send confirmation:', err),
  );
  pushNewBooking((barber as BarberRow).push_token ?? null, {
    customerName:  input.customer_name,
    serviceName:   service.name,
    date, time,
    appointmentId: appt.id,
  }).catch(() => {});

  return NextResponse.json({
    appointment_id: appt.id,
    ...(seriesId ? { series_id: seriesId, total_created: totalCreated } : {}),
  });
}

function formatDatetime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}
