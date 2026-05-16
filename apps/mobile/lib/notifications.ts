/**
 * Expo Push Notifications helpers.
 *
 * Usage:
 *   1. Call `registerForPushNotifications()` after login
 *   2. If a token is returned, call `savePushToken(token)` to persist it
 *
 * Push notifications only work on physical devices (not simulators).
 * The functions fail gracefully — they never throw.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// ── Foreground notification behaviour ─────────────────────────────────────────
// Show alert + sound even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── Register ───────────────────────────────────────────────────────────────────
/**
 * Requests notification permissions and returns the Expo push token string,
 * or null if permissions were denied or we're on a simulator/web.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status: current } = await Notifications.getPermissionsAsync();
    let finalStatus = current;

    if (current !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[push] Permission not granted by user.');
      return null;
    }

    // getExpoPushTokenAsync throws on simulators — we catch it below
    const { data } = await Notifications.getExpoPushTokenAsync();
    console.log('[push] Token obtained:', data.slice(0, 30) + '…');
    return data;
  } catch (err: any) {
    // Expected on iOS/Android simulators — not a real error
    console.log('[push] Could not obtain push token:', err?.message ?? err);
    return null;
  }
}

// ── Persist ────────────────────────────────────────────────────────────────────
/**
 * Saves the Expo push token to the `barbers.push_token` column for the
 * currently authenticated user.  No-ops if user is not logged in.
 */
export async function savePushToken(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('barbers')
      .update({ push_token: token })
      .eq('user_id', user.id);

    if (error) console.error('[push] Failed to save token:', error.message);
    else console.log('[push] Token saved to Supabase ✓');
  } catch (err: any) {
    console.error('[push] savePushToken error:', err?.message ?? err);
  }
}

// ── Clear (on logout) ──────────────────────────────────────────────────────────
/**
 * Clears the push token from Supabase on logout so the barber doesn't
 * receive notifications after signing out.
 */
export async function clearPushToken(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('barbers')
      .update({ push_token: null })
      .eq('user_id', user.id);
  } catch {
    // Ignore — best effort
  }
}
