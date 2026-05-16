export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';

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
  // ── API key check ──────────────────────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ai_not_configured' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const groq = new Groq({ apiKey });

  // ── Auth guard ─────────────────────────────────────────────────────────
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'content-type': 'application/json' },
    });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    });
  }

  const { kind, barberId, ...data } = body;

  if (!kind) {
    return new Response(JSON.stringify({ error: 'missing_kind' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    });
  }

  // ── Verify barber ownership ────────────────────────────────────────────
  if (barberId) {
    const { data: barber } = await supabase
      .from('barbers')
      .select('id')
      .eq('id', barberId)
      .eq('owner_id', user.id)
      .single();
    if (!barber) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { 'content-type': 'application/json' },
      });
    }
  }

  const prompt = buildPrompt(kind, data);

  // ── Stream response ────────────────────────────────────────────────────
  let fullOutput = '';

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        const stream = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          max_tokens: 700,
          stream: true,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user',   content: prompt },
          ],
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) {
            fullOutput += text;
            controller.enqueue(enc.encode(text));
          }
        }
      } catch (err: any) {
        controller.enqueue(
          enc.encode(`\n\n[ERREUR] ${err?.message ?? 'Génération échouée.'}`),
        );
      } finally {
        controller.close();

        // Log to DB — fire and forget
        if (barberId && fullOutput) {
          void supabase.from('ai_generations').insert({
            barber_id: barberId,
            kind,
            prompt,
            output: fullOutput,
          });
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}
