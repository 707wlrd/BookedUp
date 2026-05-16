import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl,
  StyleSheet, Text, View, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@bookedup/shared';

type Appt = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price_cents: number;
  customer_name: string;
  notes: string | null;
  services: { name: string; duration_minutes: number } | null;
  barbers: { shop_name: string; city: string | null } | null;
};

type Tab = 'upcoming' | 'past';

export default function MyAppointmentsScreen() {
  const [appts, setAppts]     = useState<Appt[]>([]);
  const [tab, setTab]         = useState<Tab>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date().toISOString();

    let q = supabase
      .from('appointments')
      .select('id, starts_at, ends_at, status, price_cents, customer_name, notes, services(name, duration_minutes), barbers(shop_name, city)')
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function cancelAppointment(id: string) {
    Alert.alert(
      'Annuler ce rendez-vous ?',
      'Cette action est irréversible.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            setCancelling(id);
            await supabase
              .from('appointments')
              .update({ status: 'cancelled' })
              .eq('id', id);
            setCancelling(null);
            load();
          },
        },
      ],
    );
  }

  const STATUS: Record<string, { label: string; bg: string; color: string }> = {
    confirmed: { label: 'Confirmé',  bg: 'rgba(124,58,237,0.12)', color: colors.electric },
    pending:   { label: 'En attente', bg: 'rgba(245,158,11,0.12)', color: colors.warning },
    completed: { label: 'Terminé',   bg: 'rgba(34,197,94,0.12)',  color: colors.success },
    cancelled: { label: 'Annulé',    bg: 'rgba(239,68,68,0.12)',  color: colors.danger },
    no_show:   { label: 'Absent',    bg: 'rgba(239,68,68,0.12)',  color: colors.danger },
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Tabs */}
      <View style={s.tabs}>
        {(['upcoming', 'past'] as Tab[]).map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'upcoming' ? 'À venir' : 'Historique'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={appts}
        keyExtractor={a => a.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={40} color={colors.textFaint} />
            <Text style={s.emptyTitle}>
              {tab === 'upcoming' ? 'Aucun RDV à venir' : 'Aucun historique'}
            </Text>
            <Text style={s.emptySub}>
              {tab === 'upcoming' ? 'Réserve en cherchant un salon.' : ''}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc   = STATUS[item.status] ?? STATUS.confirmed;
          const date = new Date(item.starts_at);
          const isPast = date < new Date() || item.status === 'cancelled' || item.status === 'no_show';
          const canCancel = tab === 'upcoming' && item.status !== 'cancelled';

          return (
            <View style={[s.card, isPast && s.cardPast]}>
              {/* Header */}
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.shopName}>
                    {(item.barbers as any)?.shop_name ?? 'Salon'}
                  </Text>
                  {(item.barbers as any)?.city ? (
                    <Text style={s.city}>{(item.barbers as any).city}</Text>
                  ) : null}
                </View>
                <View style={[s.statusChip, { backgroundColor: sc.bg }]}>
                  <Text style={[s.statusText, { color: sc.color }]}>{sc.label}</Text>
                </View>
              </View>

              {/* Details */}
              <View style={s.divider} />
              <View style={s.details}>
                <View style={s.detailRow}>
                  <Ionicons name="cut-outline" size={14} color={colors.textFaint} />
                  <Text style={s.detailText}>
                    {(item.services as any)?.name ?? 'Prestation'}
                    {(item.services as any)?.duration_minutes
                      ? ` · ${(item.services as any).duration_minutes} min`
                      : ''}
                  </Text>
                </View>
                <View style={s.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textFaint} />
                  <Text style={s.detailText}>
                    {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </Text>
                </View>
                <View style={s.detailRow}>
                  <Ionicons name="time-outline" size={14} color={colors.textFaint} />
                  <Text style={s.detailText}>
                    {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={s.detailRow}>
                  <Ionicons name="card-outline" size={14} color={colors.textFaint} />
                  <Text style={s.detailText}>{formatPrice(item.price_cents)}</Text>
                </View>
              </View>

              {canCancel && (
                <Pressable
                  onPress={() => cancelAppointment(item.id)}
                  disabled={cancelling === item.id}
                  style={s.cancelBtn}
                >
                  {cancelling === item.id
                    ? <ActivityIndicator size="small" color={colors.danger} />
                    : <Text style={s.cancelText}>Annuler ce RDV</Text>
                  }
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.md },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: spacing.sm },
  tabActive: { borderBottomColor: colors.electric },
  tabText: { color: colors.textDim, fontWeight: '500', fontSize: 14 },
  tabTextActive: { color: colors.text, fontWeight: '600' },

  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 80 },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cardPast: { opacity: 0.65 },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  shopName:   { color: colors.text, fontWeight: '700', fontSize: 15 },
  city:       { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '600' },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  details:    { gap: spacing.sm },
  detailRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailText: { color: colors.textDim, fontSize: 13 },

  cancelBtn: { marginTop: spacing.md, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' },
  cancelText: { color: colors.danger, fontWeight: '600', fontSize: 13 },

  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
  emptySub:   { color: colors.textFaint, fontSize: 13 },
});
