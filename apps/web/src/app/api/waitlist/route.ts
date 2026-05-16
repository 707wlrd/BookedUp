/**
 * POST /api/waitlist
 * Join the waitlist for a barber on a specific date.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const Body = z.object({
  barber_id:      z.string().uuid(),
  service_id:     z.string().uuid().optional().nullable(),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  customer_name:  z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().optional(),
  notes:          z.string().optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(req, { limit: 3, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans une minute.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = createClient();

  // Check barber exists
  const { data: barber } = await supabase
    .from('barbers').select('id').eq('id', input.barber_id).single();
  if (!barber) return NextResponse.json({ error: 'barber_not_found' }, { status: 404 });

  // Avoid duplicate entries for same email + barber + date
  const { data: existing } = await supabase
    .from('waitlist')
    .select('id')
    .eq('barber_id', input.barber_id)
    .eq('customer_email', input.customer_email)
    .eq('preferred_date', input.preferred_date)
    .is('notified_at', null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error } = await supabase.from('waitlist').insert({
    barber_id:      input.barber_id,
    service_id:     input.service_id ?? null,
    preferred_date: input.preferred_date,
    customer_name:  input.customer_name,
    customer_email: input.customer_email,
    customer_phone: input.customer_phone ?? null,
    notes:          input.notes ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
