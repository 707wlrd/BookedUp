import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import {
  registerForPushNotifications,
  savePushToken,
  clearPushToken,
} from '@/lib/notifications';
import { SplashOverlay } from '@/components/SplashOverlay';
import type { Session } from '@supabase/supabase-js';

// ── Auth guard ─────────────────────────────────────────────────────────────────
function useAuthGuard(session: Session | null | undefined) {
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (session === undefined) return; // still loading
    const inAuth = segments[0] === 'auth';
    if (!session && !inAuth) {
      router.replace('/auth' as any);
    } else if (session && inAuth) {
      router.replace('/' as any);
    }
  }, [session, segments]);
}

// ── Root layout ────────────────────────────────────────────────────────────────
export default function RootLayout() {
  const router = useRouter();
  const [session,     setSession]     = useState<Session | null | undefined>(undefined);
  const [showSplash,  setShowSplash]  = useState(true);
  const notifListener    = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // ── Auth state ───────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Push notifications (register after login, clear on logout) ───────────
  useEffect(() => {
    if (!session) {
      // Logged out — clear token so barber stops receiving notifications
      clearPushToken();
      return;
    }

    // Logged in — register and save token
    registerForPushNotifications().then(token => {
      if (token) savePushToken(token);
    });

    // Foreground notification listener — fired when a notification arrives
    // while the app is open (we just let the default handler show an alert)
    notifListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[push] Received:', notification.request.content.title);
    });

    // Interaction listener — fired when the user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, any>;
      const apptId = data?.appointment_id as string | undefined;
      if (apptId && (
        data?.type === 'new_booking' ||
        data?.type === 'deposit_paid' ||
        data?.type === 'cancellation'
      )) {
        // Navigate to the appointment detail screen
        router.push(`/appointment/${apptId}` as any);
      }
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [session?.user?.id]); // re-run only when user changes (login/logout)

  useAuthGuard(session);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {showSplash && <SplashOverlay variant="pro" onDone={() => setShowSplash(false)} />}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#05060a' },
          headerTintColor: '#ffffff',
          contentStyle: { backgroundColor: '#05060a' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)"             options={{ headerShown: false }} />
        <Stack.Screen name="auth"               options={{ headerShown: false }} />
        <Stack.Screen name="appointment/[id]"   options={{ title: 'Rendez-vous', headerBackTitle: 'Retour' }} />
        <Stack.Screen name="profile"            options={{ headerShown: false }} />
        <Stack.Screen name="profile-salon"      options={{ title: 'Mon salon',              headerBackTitle: 'Profil' }} />
        <Stack.Screen name="profile-personal"   options={{ title: 'Informations',           headerBackTitle: 'Profil' }} />
        <Stack.Screen name="profile-services"   options={{ title: 'Prestations & tarifs',   headerBackTitle: 'Profil' }} />
        <Stack.Screen name="profile-stylists"   options={{ title: 'Équipe',                 headerBackTitle: 'Profil' }} />
        <Stack.Screen name="profile-hours"      options={{ title: 'Horaires d\'ouverture',  headerBackTitle: 'Profil' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
