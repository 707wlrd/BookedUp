import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl,
  StyleSheet, Text, View,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';
import { formatPrice } from '@bookedup/shared';
import { supabase } from '@/lib/supabase';

type Appt = {
  id: string;
  starts_at: string;
  customer_name: string;
  status: string;
  price_cents: number;
  services: { name: string } | null;
};

type Tab = 'upcoming' | 'all';

export default function AppointmentsScreen() {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: barber } = await supabase
      .from('barbers').select('id').eq('owner_id', user.id).single();
    if (!barber) return;

    let q = supabase
      .from('appointments')
      .select('id, starts_at, customer_name, status, price_cents, services(name)')
      .eq('barber_id', barber.id)
      .order('starts_at', { ascending: false });

    if (tab === 'upcoming') {
      q = q.gte('starts_at', new Date().toISOString()).not('status', 'in', '("cancelled","no_show")');
    }

    const { data } = await q.limit(50);
    setAppts((data ?? []) as Appt[]);
  }, [tab]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    confirmed: { bg: 'rgba(59,130,255,0.12)',  text: colors.electric, label: 'Confirmé' },
    pending:   { bg: 'rgba(245,158,11,0.12)', text: colors.warning,  label: 'En attente' },
    completed: { bg: 'rgba(34,197,94,0.12)',  text: colors.success,  label: 'Terminé' },
    cancelled: { bg: 'rgba(239,68,68,0.12)',  text: colors.danger,   label: 'Annulé' },
    no_show:   { bg: 'rgba(239,68,68,0.12)',  text: colors.danger,   label: 'No-show' },
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
        {(['upcoming', 'all'] as Tab[]).map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'upcoming' ? 'À venir' : 'Tous'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={appts}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={36} color={colors.textFaint} />
            <Text style={s.emptyText}>Aucun rendez-vous</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.confirmed;
          const d = new Date(item.starts_at);
          return (
            <Link href={`/appointment/${item.id}`} asChild>
              <Pressable style={s.row}>
                {/* Date column */}
                <View style={s.dateCol}>
                  <Text style={s.dateDay}>{d.getDate()}</Text>
                  <Text style={s.dateMon}>
                    {d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{item.customer_name}</Text>
                  <Text style={s.rowSub}>{(item.services as any)?.name ?? ''}</Text>
                  <Text style={s.rowTime}>
                    {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.price}>{formatPrice(item.price_cents)}</Text>
                  <View style={[s.chip, { backgroundColor: sc.bg }]}>
                    <Text style={[s.chipText, { color: sc.text }]}>{sc.label}</Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  tabs: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.md, gap: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.electric },
  tabText: { color: colors.textDim, fontWeight: '500', fontSize: 14 },
  tabTextActive: { color: colors.text, fontWeight: '600' },

  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  dateCol: {
    width: 40, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md, paddingVertical: 6,
  },
  dateDay: { color: colors.text, fontSize: 18, fontWeight: '700' },
  dateMon: { color: colors.textFaint, fontSize: 10, textTransform: 'uppercase', marginTop: 1 },
  rowTitle: { color: colors.text, fontWeight: '600' },
  rowSub:   { color: colors.textDim, fontSize: 12, marginTop: 1 },
  rowTime:  { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  price: { color: colors.text, fontWeight: '600' },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  chipText: { fontSize: 10, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyText: { color: colors.textFaint, fontSize: 14 },
});
