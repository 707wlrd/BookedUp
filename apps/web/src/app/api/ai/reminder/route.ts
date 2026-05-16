import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReminder } from '@/lib/anthropic';

export async function POST(req: Request) {
  // ── Auth guard ────────────────────────────────────────────────────────
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Verify barberId ownership
  if (body.barberId) {
    const { data: barber } = await supabase
      .from('barbers').select('id').eq('id', body.barberId).eq('owner_id', user.id).single();
    if (!barber) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      output: `Hey ${body.customerName ?? 'champion'} 👋 Petit rappel pour ton RDV ${body.service ?? ''} chez ${body.shopName ?? ''} ${body.when ?? 'bientôt'}. Tu confirmes ? Réponds OUI ou appelle-nous. À tout vite ✂️`,
    });
  }
  try {
    const output = await generateReminder(body);
    return NextResponse.json({ output });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
