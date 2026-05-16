import { NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe, PRICE_IDS, type PaidTier } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

const Body = z.object({
  tier: z.enum(['pro']),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const tier = parsed.data.tier as PaidTier;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: barber } = await supabase
    .from('barbers')
    .select('id, stripe_customer_id')
    .eq('owner_id', user.id)
    .single();
  if (!barber) return NextResponse.json({ error: 'no_barber_profile' }, { status: 400 });

  let customerId = barber.stripe_customer_id;
  if (!customerId) {
    const c = await stripe.customers.create({
      email: user.email!,
      metadata: { barber_id: barber.id },
    });
    customerId = c.id;
    await supabase.from('barbers').update({ stripe_customer_id: customerId }).eq('id', barber.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
    metadata: { barber_id: barber.id, tier },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/studio/settings?upgrade=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/studio/settings?upgrade=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
