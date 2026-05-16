/**
 * Central email sending helpers.
 * Wraps Resend so the API routes stay clean.
 */
import { resend, FROM_EMAIL } from '@/lib/resend';
import {
  emailCustomerConfirmation,
  emailCustomerDepositPaid,
  emailBarberNewBooking,
  emailCustomerReminder,
  emailReviewRequest,
  emailWaitlistSlotOpen,
  emailCustomerCancellation,
  emailBarberCancellation,
  type ApptEmailData,
  type BarberNotifData,
  type ReviewEmailData,
  type WaitlistEmailData,
  type CancelEmailData,
} from '@/lib/email-templates';

async function send(to: string | string[], subject: string, html: string) {
  // Skip silently if no API key configured (dev without Resend account)
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] Would send "${subject}" to ${to} (RESEND_API_KEY not set)`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch (err: any) {
    console.error('[email] Resend error:', err?.message ?? err);
  }
}

/** After booking confirmed immediately (no deposit) */
export async function sendConfirmedEmails(data: BarberNotifData) {
  await Promise.all([
    send(
      data.customerEmail,
      `Réservation confirmée chez ${data.shopName}`,
      emailCustomerConfirmation(data),
    ),
    send(
      data.barberEmail,
      `Nouveau RDV — ${data.customerName}`,
      emailBarberNewBooking(data),
    ),
  ]);
}

/** After Stripe deposit payment confirmed via webhook */
export async function sendDepositPaidEmails(data: BarberNotifData) {
  await Promise.all([
    send(
      data.customerEmail,
      `Acompte reçu — RDV confirmé chez ${data.shopName}`,
      emailCustomerDepositPaid(data),
    ),
    send(
      data.barberEmail,
      `Acompte payé — ${data.customerName}`,
      emailBarberNewBooking(data),
    ),
  ]);
}

/** 24h before appointment */
export async function sendReminderEmail(data: ApptEmailData) {
  await send(
    data.customerEmail,
    `Rappel : RDV demain chez ${data.shopName}`,
    emailCustomerReminder(data),
  );
}

/** J+1 after completed appointment — ask for review */
export async function sendReviewRequestEmail(data: ReviewEmailData) {
  await send(
    data.customerEmail,
    `Comment s'est passé ton RDV chez ${data.shopName} ? ⭐`,
    emailReviewRequest(data),
  );
}

/** Notify first waitlist entry that a slot opened */
export async function sendWaitlistNotification(data: WaitlistEmailData) {
  await send(
    data.customerEmail,
    `Un créneau s'est libéré chez ${data.shopName} ! 🎉`,
    emailWaitlistSlotOpen(data),
  );
}

/** Customer cancelled their appointment */
export async function sendCancellationEmails(
  data: CancelEmailData & { barberEmail: string },
) {
  await Promise.all([
    send(
      data.customerEmail,
      `Annulation confirmée — ${data.shopName}`,
      emailCustomerCancellation(data),
    ),
    send(
      data.barberEmail,
      `RDV annulé — ${data.customerName}`,
      emailBarberCancellation(data),
    ),
  ]);
}
