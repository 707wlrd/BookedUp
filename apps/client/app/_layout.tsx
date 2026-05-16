import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { SplashOverlay } from '@/components/SplashOverlay';
import { registerForPushNotifications, saveClientPushToken, clearClientPushToken } from '@/lib/notifications';
import type { Session } from '@supabase/supabase-js';

function useAuthGuard(session: Session | null | undefined) {
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (session === undefined) return;
    const inAuth = segments[0] === 'auth';
    if (!session && !inAuth) {
      router.replace('/auth' as any);
    } else if (session && inAuth) {
      router.replace('/' as any);
    }
  }, [session, segments]);
}

export default function RootLayout() {
  const [session,    setSession]    = useState<Session | null | undefined>(undefined);
  const [showSplash, setShowSplash] = useState(true);
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const router        = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) {
        // Enregistrement push à la connexion
        registerForPushNotifications().then(token => {
          if (token) saveClientPushToken(token);
        });
      } else {
        // Nettoyage à la déconnexion
        clearClientPushToken();
      }
    });

    // Écouter les taps sur notification → naviguer vers le RDV
    notifListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.appointment_id) {
        router.push(`/booking/success?id=${data.appointment_id}` as any);
      }
    });

    return () => {
      subscription.unsubscribe();
      notifListener.current?.remove();
    };
  }, []);

  useAuthGuard(session);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {showSplash && <SplashOverlay onDone={() => setShowSplash(false)} />}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#05060a' },
          headerTintColor: '#ffffff',
          contentStyle: { backgroundColor: '#05060a' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)"           options={{ headerShown: false }} />
        <Stack.Screen name="auth"             options={{ headerShown: false }} />
        <Stack.Screen name="barber/[id]"      options={{ title: '', headerBackTitle: 'Retour' }} />
        <Stack.Screen name="book/[barberId]"  options={{ title: 'Réserver', headerBackTitle: 'Retour' }} />
        <Stack.Screen name="booking/success"  options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit"     options={{ title: 'Mon profil', headerBackTitle: 'Profil' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
