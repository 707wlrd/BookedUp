import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

// Default from address — use your verified domain here once configured in Resend.
// During development, "onboarding@resend.dev" works without domain verification.
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'BookedUp <onboarding@resend.dev>';
export const REPLY_TO   = process.env.RESEND_REPLY_TO ?? 'no-reply@bookedup.fr';
