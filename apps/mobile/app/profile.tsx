import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type UserInfo = {
  id: string;
  email: string;
  full_name: string;
};

type Appointment = {
  id: string;
  starts_at: string;
  status: string;
  services: { name: string } | null;
  barbers: { name: string } | null;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmé',   color: colors.electric },
  pending:   { label: 'En attente', color: colors.warning },
  completed: { label: 'Terminé',    color: colors.success },
  cancelled: { label: 'Annulé',     color: colors.danger },
  no_show:   { label: 'No-show',    color: colors.textFaint },
};

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const fullName =
        authUser.user_metadata?.full_name ??
        authUser.user_metadata?.name ??
        authUser.email?.split('@')[0] ??
        'Utilisateur';

      setUser({
        id: authUser.id,
        email: authUser.email ?? '',
        full_name: fullName,
      });

      const { data } = await supabase
        .from('appointments')
        .select('id, starts_at, status, services(name), barbers(name)')
        .eq('customer_id', authUser.id)
        .order('starts_at', { ascending: false })
        .limit(5);

      setAppointments((data ?? []) as Appointment[]);
      setLoading(false);
    }

    load();
  }, []);

  function handleSignOut() {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            await supabase.auth.signOut();
            router.replace('/' as any);
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  const initials = user ? getInitials(user.full_name) : '?';

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      {/* Avatar + identité */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{user?.full_name}</Text>
        <Text style={s.email}>{user?.email}</Text>
      </View>

      {/* Derniers RDV */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Mes derniers rendez-vous</Text>

        {appointments.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={colors.textFaint} />
            <Text style={s.emptyText}>Aucun rendez-vous pour l'instant</Text>
          </View>
        ) : (
          appointments.map(appt => {
            const sc = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.confirmed;
            const startsAt = new Date(appt.starts_at);
            const service = appt.services as any;
            const barber = appt.barbers as any;

            return (
              <Pressable
                key={appt.id}
                style={s.apptCard}
                onPress={() => router.push(`/appointment/${appt.id}` as any)}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.apptService}>{service?.name ?? 'Service'}</Text>
                  {barber?.name && (
                    <Text style={s.apptBarber}>avec {barber.name}</Text>
                  )}
                  <Text style={s.apptDate}>
                    {startsAt.toLocaleDateString('fr-FR', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                    {'  '}
                    {startsAt.toLocaleTimeString('fr-FR', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={s.statusBadge}>
                  <Text style={[s.statusText, { color: sc.color }]}>{sc.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
            );
          })
        )}
      </View>

      {/* Bouton déconnexion */}
      <Pressable
        style={[s.signOutBtn, signingOut && { opacity: 0.6 }]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color={colors.danger} size="small" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={s.signOutText}>Se déconnecter</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: 60, gap: spacing.md },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  header: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(124,58,237,0.4)',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { color: colors.text, fontSize: 22, fontWeight: '700' },
  email: { color: colors.textDim, fontSize: 14 },

  section: { gap: spacing.sm },
  sectionLabel: {
    color: colors.textFaint, fontSize: 10,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 4,
  },

  emptyCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, alignItems: 'center', gap: spacing.sm,
  },
  emptyText: { color: colors.textFaint, fontSize: 13 },

  apptCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  apptService: { color: colors.text, fontWeight: '600', fontSize: 14 },
  apptBarber: { color: colors.textDim, fontSize: 12 },
  apptDate: { color: colors.textFaint, fontSize: 12, marginTop: 2 },

  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  signOutBtn: {
    marginTop: spacing.md,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: radius.full,
    paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  signOutText: { color: colors.danger, fontWeight: '600', fontSize: 15 },
});
