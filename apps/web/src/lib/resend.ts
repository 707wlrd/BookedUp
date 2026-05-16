import { Resend } from 'resend';

// Lazy singleton — instancié seulement au runtime (pas au build)
let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key || key === 'xxx') throw new Error('RESEND_API_KEY is not configured');
    _resend = new Resend(key);
  }
  return _resend;
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'BookedUp <onboarding@resend.dev>';
export const REPLY_TO   = process.env.RESEND_REPLY_TO  ?? 'no-reply@bookedup.fr';
