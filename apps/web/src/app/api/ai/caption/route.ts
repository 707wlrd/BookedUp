import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCaption } from '@/lib/anthropic';

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
    return NextResponse.json({ output: demoOutput() });
  }
  try {
    const output = await generateCaption(body);
    return NextResponse.json({ output });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function demoOutput() {
  return `✂️ Le fade qui parle pour toi.\n\n• Coupe nette\n• Lignes propres\n• Finitions précises\n\n👉 Réserve via le lien en bio.\n#barber #fade #paris #cleanCut #freshcut #barberlife #malikcuts #booked`;
}
