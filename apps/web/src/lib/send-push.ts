/**
 * Expo Push Notification sender (server-side).
 *
 * Calls the Expo Push API directly — no extra SDK required.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * Gracefully no-ops if the token is missing or invalid.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type PushPayload = {
  /** Expo push token, e.g. "ExponentPushToken[xxxxxx]" */
  token: string;
  title: string;
  body: string;
  /** Optional deep-link data passed to the notification handler */
  data?: Record<string, unknown>;
};

/**
 * Sends a single push notification via the Expo Push API.
 * Never throws — logs errors and returns silently.
 */
export async function sendPushNotification({
  token, title, body, data = {},
}: PushPayload): Promise<void> {
  if (!token || !token.startsWith('ExponentPushToken')) {
    return; // not a valid Expo token — skip silently
  }

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method:  'POST',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: token, title, body, data, sound: 'default' }),
    });

    const json = await res.json();

    // Expo API returns { data: [{ status: 'ok' | 'error', ... }] }
    const result = json?.data?.[0] ?? json;
    if (result?.status === 'error') {
      console.error('[push] Expo push error:', result.message, result.details);
    }
  } catch (err: any) {
    console.error('[push] Failed to send push notification:', err?.message ?? err);
  }
}

/**
 * Convenience: sends a "new booking" push to a barber.
 */
export async function pushNewBooking(token: string | null | undefined, params: {
  customerName: string;
  serviceName:  string;
  time:         string; // e.g. "14:30"
  date:         string; // e.g. "lun. 16 juin"
  appointmentId: string;
}) {
  if (!token) return;
  await sendPushNotification({
    token,
    title: `Nouveau RDV 📅`,
    body:  `${params.customerName} · ${params.serviceName} · ${params.date} à ${params.time}`,
    data:  { appointment_id: params.appointmentId, type: 'new_booking' },
  });
}

/**
 * Convenience: sends a "booking cancelled" push to a barber.
 */
export async function pushCancellation(token: string | null | undefined, params: {
  customerName: string;
  serviceName:  string;
  date:         string;
  time:         string;
  appointmentId: string;
}) {
  if (!token) return;
  await sendPushNotification({
    token,
    title: `RDV annulé ❌`,
    body:  `${params.customerName} · ${params.serviceName} · ${params.date} à ${params.time}`,
    data:  { appointment_id: params.appointmentId, type: 'cancellation' },
  });
}

/**
 * Convenience: sends a "booking confirmed" push to a CLIENT.
 * Called when the barber confirms a pending appointment.
 */
export async function pushClientConfirmed(token: string | null | undefined, params: {
  shopName:    string;
  serviceName: string;
  date:        string;
  time:        string;
  appointmentId: string;
}) {
  if (!token) return;
  await sendPushNotification({
    token,
    title: `RDV confirmé ✅`,
    body:  `${params.shopName} · ${params.serviceName} · ${params.date} à ${params.time}`,
    data:  { appointment_id: params.appointmentId, type: 'booking_confirmed' },
  });
}

/**
 * Convenience: sends a "booking cancelled" push to a CLIENT.
 */
export async function pushClientCancelled(token: string | null | undefined, params: {
  shopName:    string;
  serviceName: string;
  date:        string;
  time:        string;
  appointmentId: string;
}) {
  if (!token) return;
  await sendPushNotification({
    token,
    title: `RDV annulé ❌`,
    body:  `${params.shopName} · ${params.serviceName} · ${params.date} à ${params.time}`,
    data:  { appointment_id: params.appointmentId, type: 'booking_cancelled' },
  });
}

/**
 * Convenience: sends a "deposit paid" push to a barber.
 */
export async function pushDepositPaid(token: string | null | undefined, params: {
  customerName: string;
  serviceName:  string;
  date:         string;
  time:         string;
  appointmentId: string;
}) {
  if (!token) return;
  await sendPushNotification({
    token,
    title: `Acompte reçu 💰`,
    body:  `${params.customerName} · ${params.serviceName} · ${params.date} à ${params.time}`,
    data:  { appointment_id: params.appointmentId, type: 'deposit_paid' },
  });
}
