import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AI_MODEL = 'claude-3-5-haiku-20241022';

// Long-lived system prompts get cached so we pay full token cost only on the first call.
const SYSTEM_BASE =
  "Tu écris pour des barbers et coiffeurs sur les réseaux sociaux. " +
  "Style: court, percutant, urbain, ton TikTok/Instagram, emojis avec parcimonie. " +
  "Toujours en français sauf indication contraire.";

export async function generateCaption(input: {
  shopName: string;
  vibe?: string;
  service?: string;
  locale?: 'fr' | 'en';
}) {
  const r = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 400,
    system: SYSTEM_BASE,
    messages: [
      {
        role: 'user',
        content:
          `Génère 3 captions Instagram pour ${input.shopName}` +
          (input.service ? ` mettant en avant: ${input.service}` : '') +
          (input.vibe ? `. Vibe: ${input.vibe}` : '') +
          `. Une caption courte (1 ligne), une moyenne (2-3 lignes), une longue (4-6 lignes). ` +
          `Inclure 5-8 hashtags pertinents à la fin de chaque.`,
      },
    ],
  });
  return r.content[0].type === 'text' ? r.content[0].text : '';
}

export async function generateAvailableSlotsPost(input: {
  shopName: string;
  slots: { day: string; times: string[] }[];
}) {
  const r = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 300,
    system: SYSTEM_BASE,
    messages: [
      {
        role: 'user',
        content:
          `Crée un post Instagram annonçant des créneaux dispos chez ${input.shopName}. ` +
          `Créneaux: ${input.slots.map(s => `${s.day} (${s.times.join(', ')})`).join(' / ')}. ` +
          `Format: titre accrocheur, liste des créneaux, CTA "réserve via le lien en bio", hashtags.`,
      },
    ],
  });
  return r.content[0].type === 'text' ? r.content[0].text : '';
}

export async function generateReminder(input: {
  customerName: string;
  shopName: string;
  when: string;
  service: string;
}) {
  const r = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 200,
    system: SYSTEM_BASE,
    messages: [
      {
        role: 'user',
        content:
          `Rédige un SMS de rappel chaleureux et bref (max 300 caractères) pour ${input.customerName}: ` +
          `RDV ${input.service} chez ${input.shopName} le ${input.when}. ` +
          `Demander confirmation par retour.`,
      },
    ],
  });
  return r.content[0].type === 'text' ? r.content[0].text : '';
}
