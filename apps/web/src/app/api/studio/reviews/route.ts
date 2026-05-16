/**
 * GET /api/studio/reviews
 * Returns all reviews for the authenticated barber, ordered newest first.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Get barber record
  const { data: barber } = await supabase
    .from('barbers')
    .select('id, rating_average, rating_count')
    .eq('owner_id', user.id)
    .single();

  if (!barber) return NextResponse.json({ error: 'barber_not_found' }, { status: 404 });

  // Fetch reviews with appointment service info
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, customer_name, customer_email, created_at,
      appointments ( services ( name ) )
    `)
    .eq('barber_id', barber.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ratingAverage: barber.rating_average ?? 0,
    ratingCount:   barber.rating_count   ?? 0,
    reviews: (reviews ?? []).map(r => {
      const appt    = (r.appointments as any) ?? {};
      const service = appt.services ?? {};
      return {
        id:            r.id,
        rating:        r.rating,
        comment:       r.comment ?? null,
        customerName:  r.customer_name,
        serviceName:   service.name ?? null,
        createdAt:     r.created_at,
      };
    }),
  });
}
