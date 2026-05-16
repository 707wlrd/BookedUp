import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { pushClientConfirmed } from '@/lib/send-push';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'missing_signature' }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `bad_signature: ${err.message}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};
      if (meta.kind === 'deposit' && meta.appointment_id) {
        await supabase
          .from('appointments')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
            stripe_payment_intent_id: session.payment_intent as string | null,
          })
          .eq('id', meta.appointment_id);

        // Push notification au client si il a l'app
        try {
          const { data: appt } = await supabase
            .from('appointments')
            .select('customer_id, starts_at, services(name), barbers(shop_name)')
            .eq('id', meta.appointment_id)
            .single();
          if (appt?.customer_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('id', appt.customer_id)
              .single();
            if (profile?.push_token) {
              const d = new Date((appt as any).starts_at);
              pushClientConfirmed(profile.push_token, {
                shopName:      (appt as any).barbers?.shop_name ?? 'Votre salon',
                serviceName:   (appt as any).services?.name ?? 'Prestation',
                date:          d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
                time:          d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                appointmentId: meta.appointment_id,
              }).catch(() => {});
            }
          }
        } catch { /* non-bloquant */ }
      } else if (meta.barber_id && meta.tier) {
        await supabase
          .from('barbers')
          .update({
            subscription_tier: meta.tier,
            stripe_subscription_id: session.subscription as string | null,
            subscription_status: 'active',
          })
          .eq('id', meta.barber_id);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const tier = sub.status === 'canceled' ? 'free' : undefined;
      await supabase
        .from('barbers')
        .update({
          subscription_status: sub.status as string,
          ...(tier ? { subscription_tier: tier } : {}),
        })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
