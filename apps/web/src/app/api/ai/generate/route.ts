import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM =
  'Tu écris pour des barbers et coiffeurs sur les réseaux sociaux. ' +
  'Style: court, percutant, urbain, ton TikTok/Instagram, emojis avec parcimonie. ' +
  'Toujours en français sauf indication contraire.';

function buildPrompt(kind: string, data: Record<string, any>): string {
  switch (kind) {
    case 'caption':
      return (
        `Génère 3 captions Instagram pour ${data.shopName}` +
        (data.service ? ` mettant en avant: ${data.service}` : '') +
        (data.vibe ? `. Vibe: ${data.vibe}` : '') +
        `. Format: une courte (1 ligne), une moyenne (2-3 lignes), une longue (4-6 lignes). ` +
        `Séparateur "---" entre chaque. Inclure 5-8 hashtags pertinents à la fin de chaque.`
      );
    case 'story':
      return (
        `Crée un texte pour une story Instagram annonçant des créneaux disponibles chez ${data.shopName}. ` +
        `Créneaux: ${(data.slots as { day: string; times: string[] }[])
          .map((s) => `${s.day} (${s.times.join(', ')})`)
          .join(' / ')}. ` +
        `Format: accroche courte (1 ligne, style urgence), liste des créneaux, CTA "réserve via le lien en bio". Moins de 200 mots.`
      );
    case 'reminder':
      return (
        `Rédige un SMS de rappel chaleureux et bref (max 300 caractères) pour ${data.customerName}: ` +
        `RDV ${data.service} chez ${data.shopName} le ${data.when}. ` +
        `Demander confirmation. Signe avec le prénom du shop.`
      );
    default:
      return 'Génère du contenu pour un salon de coiffure.';
  }
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY manquante', { status: 503 });
  }

  // ── Auth guard ─────────────────────────────────────────────────────────
  const supabaseAuth = createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { kind, barberId, ...data } = await req.json();

  // Verify the barber belongs to the authenticated user
  if (barberId) {
    const { data: barber } = await supabaseAuth
      .from('barbers')
      .select('id')
      .eq('id', barberId)
      .eq('owner_id', user.id)
      .single();
    if (!barber) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const stream = anthropic.messages.stream({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 600,
    system: SYSTEM,
    messages: [{ role: 'user', content: buildPrompt(kind, data) }],
  });

  // Collect full output for DB logging
  let fullOutput = '';

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text;
            fullOutput += text;
            controller.enqueue(enc.encode(text));
          }
        }
      } finally {
        controller.close();

        // Log to DB (fire & forget)
        if (barberId) {
          try {
            await supabaseAuth.from('ai_generations').insert({
              barber_id: barberId,
              kind,
              prompt: buildPrompt(kind, data),
              output: fullOutput,
            });
          } catch { /* non-blocking */ }
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
