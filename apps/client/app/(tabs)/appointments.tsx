import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Pressable,
  RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@bookedup/shared';

type Appt = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price_cents: number;
  services: { name: string; duration_minutes: number } | null;
  barbers: { id: string; shop_name: string; city: string | null } | null;
};

type Tab = 'upcoming' | 'past';

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmé',   color: colors.electric, bg: 'rgba(124,58,237,0.12)' },
  pending:   { label: 'En attente', color: colors.warning,  bg: 'rgba(245,158,11,0.12)' },
  completed: { label: 'Terminé',    color: colors.success,  bg: 'rgba(34,197,94,0.12)'  },
  cancelled: { label: 'Annulé',     color: colors.danger,   bg: 'rgba(239,68,68,0.12)'  },
  no_show:   { label: 'Absent',     color: colors.danger,   bg: 'rgba(239,68,68,0.12)'  },
};

export default function AppointmentsScreen() {
  const [tab, setTab]           = useState<Tab>('upcoming');
  const [appts, setAppts]       = useState<Appt[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();

    let q = supabase
      .from('appointments')
      .select('id, starts_at, ends_at, status, price_cents, services(name, duration_minutes), barbers(id, shop_name, city)')
      .eq('customer_id', user.id)
      .order('starts_at', { ascending: tab === 'upcoming' });

    if (tab === 'upcoming') {
      q = q.gte('starts_at', now).not('status', 'in', '("cancelled","no_show")');
    } else {
      q = q.or(`starts_at.lt.${now},status.in.(cancelled,no_show)`);
    }

    const { data } = await q.limit(30);
    setAppts((data ?? []) as Appt[]);
  }, [tab]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  // ── Realtime: rafraîchit la liste dès qu'un RDV change pour ce client ──
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      channel = supabase
        .channel(`client-appts:${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `customer_id=eq.${user.id}`,
        }, () => { load(); })
        .subscribe();
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function confirmCancel(id: string) {
    Alert.alert(
      'Annuler ce rendez-vous ?',
      'Cette action est irréversible. Le salon en sera informé.',
      [
        { text: 'Garder le RDV', style: 'cancel' },
        {
          text: 'Annuler le RDV',
          style: 'destructive',
          onPress: async () => {
            setCancelling(id);
            await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
            setCancelling(null);
            load();
          },
        },
      ],
    );
  }

  const isEmpty = !loading && appts.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Tabs */}
      <View style={s.tabs}>
        {(['upcoming', 'past'] as Tab[]).map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'upcoming' ? 'Prochaines réservations' : 'Réservations antérieures'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.electric} size="large" />
        </View>
      ) : isEmpty ? (
        <View style={s.emptyWrap}>
          <Ionicons name="calendar-outline" size={56} color={colors.textFaint} />
          <Text style={s.emptyTitle}>
            {tab === 'upcoming' ? 'Pas encore de réservation' : 'Aucun historique'}
          </Text>
          <Text style={s.emptySub}>
            {tab === 'upcoming' ? 'Vos prochains rendez-vous apparaîtront ici.' : ''}
          </Text>
          {tab === 'upcoming' && (
            <Link href="/" asChild>
              <Pressable style={s.ctaBtn}>
                <Text style={s.ctaBtnText}>Prendre un rendez-vous</Text>
              </Pressable>
            </Link>
          )}
        </View>
      ) : (
        <FlatList
          data={appts}
          keyExtractor={a => a.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />}
          renderItem={({ item }) => {
            const sc   = STATUS[item.status] ?? STATUS.confirmed;
            const date = new Date(item.starts_at);
            const canCancel = tab === 'upcoming' && item.status !== 'cancelled';

            return (
              <View style={s.card}>
                {/* Salon + status */}
                <View style={s.cardTop}>
                  <View style={s.salonDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.salonName}>
                      {(item.barbers as any)?.shop_name ?? 'Salon'}
                    </Text>
                    {(item.barbers as any)?.city ? (
                      <Text style={s.salonCity}>{(item.barbers as any).city}</Text>
                    ) : null}
                  </View>
                  <View style={[s.statusChip, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                </View>

                {/* Date block */}
                <View style={s.dateBlock}>
                  <View style={s.dateBox}>
                    <Text style={s.dateDay}>{date.getDate()}</Text>
                    <Text style={s.dateMon}>
                      {date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                    </Text>
                  </View>
                  <View style={s.dateInfo}>
                    <Text style={s.dateWeekday}>
                      {date.toLocaleDateString('fr-FR', { weekday: 'long' })}
                    </Text>
                    <Text style={s.dateTime}>
                      {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {(item.services as any)?.duration_minutes
                        ? ` · ${(item.services as any).duration_minutes} min`
                        : ''}
                    </Text>
                    <Text style={s.dateSvc}>
                      {(item.services as any)?.name ?? 'Prestation'}
                    </Text>
                  </View>
                  <Text style={s.price}>{formatPrice(item.price_cents)}</Text>
                </View>

                {canCancel && (
                  <Pressable
                    onPress={() => confirmCancel(item.id)}
                    disabled={cancelling === item.id}
                    style={s.cancelBtn}
                  >
                    {cancelling === item.id
                      ? <ActivityIndicator size="small" color={colors.danger} />
                      : <Text style={s.cancelText}>Annuler ce rendez-vous</Text>
                    }
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.electric },
  tabText: { color: colors.textFaint, fontSize: 13, fontWeight: '500', textAlign: 'center' },
  tabTextActive: { color: colors.text, fontWeight: '600' },

  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  salonDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.electric, flexShrink: 0 },
  salonName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  salonCity: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700' },

  dateBlock: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  dateBox: { width: 48, alignItems: 'center', backgroundColor: colors.electricDim, borderRadius: radius.md, paddingVertical: 8 },
  dateDay: { color: colors.electric, fontSize: 22, fontWeight: '800', lineHeight: 24 },
  dateMon: { color: colors.electric, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  dateInfo: { flex: 1 },
  dateWeekday: { color: colors.text, fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  dateTime: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  dateSvc: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  price: { color: colors.text, fontWeight: '700', fontSize: 16 },

  cancelBtn: { marginHorizontal: spacing.md, marginBottom: spacing.md, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' },
  cancelText: { color: colors.danger, fontWeight: '600', fontSize: 13 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySub:   { color: colors.textFaint, fontSize: 14, textAlign: 'center' },
  ctaBtn: { marginTop: spacing.sm, backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 14, paddingHorizontal: 32 },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
