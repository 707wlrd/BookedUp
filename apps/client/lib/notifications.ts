/**
 * Push notifications — App client BookedUp
 * Enregistre le token Expo et le sauvegarde dans profiles.push_token
 * pour recevoir des notifications quand un RDV est confirmé/modifié.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Afficher les notifications même en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

/**
 * Demande les permissions et retourne le token Expo push, ou null.
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
    if (finalStatus !== 'granted') return null;

    const { data } = await Notifications.getExpoPushTokenAsync();
    return data;
  } catch {
    return null;
  }
}

/**
 * Sauvegarde le token dans profiles.push_token pour l'utilisateur connecté.
 */
export async function saveClientPushToken(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', user.id);
  } catch { /* silencieux */ }
}

/**
 * Efface le token à la déconnexion.
 */
export async function clearClientPushToken(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ push_token: null })
      .eq('id', user.id);
  } catch { /* silencieux */ }
}
