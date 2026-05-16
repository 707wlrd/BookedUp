/**
 * GET  /api/reviews/[token]  — fetch appointment context for the review form
 * POST /api/reviews/[token]  — submit a review
 *
 * [token] = appointment UUID (used as a single-use review token)
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { asRow, type BarberRow, type ServiceRow } from '@/lib/types';

type Params = { params: { token: string } };

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET(_req: Request, { params }: Params) {
  const { token } = params;
  const supabase = createClient();

  // Fetch appointment + related data
  const { data: appt, error } = await supabase
    .from('appointments')
    .select(`
      id, starts_at, customer_name, customer_email, status,
      services ( name ),
      barbers  ( shop_name )
    `)
    .eq('id', token)
    .single();

  if (error || !appt) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Format date
  const date = new Date(appt.starts_at).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const service = asRow<ServiceRow>(appt.services);
  const barber  = asRow<BarberRow>(appt.barbers);

  // Check if already reviewed
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id, rating')
    .eq('appointment_id', token)
    .maybeSingle();

  if (existingReview) {
    return NextResponse.json({
      shopName:       barber.shop_name ?? 'Le salon',
      serviceName:    service.name    ?? 'Service',
      date,
      already_reviewed: true,
      existingRating: existingReview.rating,
    });
  }

  return NextResponse.json({
    shopName:    barber.shop_name ?? 'Le salon',
    serviceName: service.name    ?? 'Service',
    date,
    already_reviewed: false,
  });
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: Request, { params }: Params) {
  const { token } = params;
  const supabase = createClient();

  // Parse body
  let rating: number, comment: string;
  try {
    const body = await req.json();
    rating  = body.rating;
    comment = body.comment ?? '';
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Validate rating
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'invalid_rating' }, { status: 400 });
  }

  // Fetch appointment to get barber_id, customer info
  const { data: appt, error: apptError } = await supabase
    .from('appointments')
    .select('id, barber_id, customer_name, customer_email')
    .eq('id', token)
    .single();

  if (apptError || !appt) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Guard: already reviewed?
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('appointment_id', token)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'already_reviewed' }, { status: 409 });
  }

  // Insert review
  const { error: insertError } = await supabase
    .from('reviews')
    .insert({
      barber_id:      appt.barber_id,
      appointment_id: appt.id,
      customer_name:  appt.customer_name,
      customer_email: appt.customer_email,
      rating,
      comment:        comment.trim() || null,
    });

  if (insertError) {
    console.error('[reviews] Insert error:', insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
