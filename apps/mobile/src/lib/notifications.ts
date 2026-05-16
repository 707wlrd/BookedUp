import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Request permission and get Expo push token. Returns null if denied. */
export async function registerForPushNotifications(): Promise<string | null> {
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#3b82ff',
    });
  }

  // projectId is required in SDK 53+ — get from EAS config or skip gracefully
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    // In Expo Go without EAS projectId configured, push tokens are unavailable
    return null;
  }
}

/** Alias kept for backward-compat with any screen that uses the old name */
export const registerForPushAsync = registerForPushNotifications;

/** Persist the push token to the barber row in Supabase */
export async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('barbers')
    .update({ push_token: token })
    .eq('owner_id', user.id);
}

/** Remove the push token from the barber row (on logout) */
export async function clearPushToken(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('barbers')
    .update({ push_token: null })
    .eq('owner_id', user.id);
}
