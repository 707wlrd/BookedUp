import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';
import { formatPrice } from '@bookedup/shared';
import { supabase } from '@/lib/supabase';

type Client = {
  customer_name: string;
  customer_email: string;
  visits: number;
  ltv: number;
  last_visit: string;
};

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: barber } = await supabase
      .from('barbers').select('id').eq('owner_id', user.id).single();
    if (!barber) return;

    const { data } = await supabase
      .from('appointments')
      .select('customer_name, customer_email, price_cents, starts_at, status')
      .eq('barber_id', barber.id)
      .in('status', ['confirmed', 'completed'])
      .order('starts_at', { ascending: false });

    // Group by email
    const map: Record<string, Client> = {};
    for (const a of data ?? []) {
      const key = a.customer_email;
      if (!map[key]) {
        map[key] = {
          customer_name: a.customer_name,
          customer_email: a.customer_email,
          visits: 0,
          ltv: 0,
          last_visit: a.starts_at,
        };
      }
      map[key].visits += 1;
      map[key].ltv += a.price_cents;
      if (a.starts_at > map[key].last_visit) map[key].last_visit = a.starts_at;
    }

    const sorted = Object.values(map).sort((a, b) => b.visits - a.visits);
    setClients(sorted);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={clients}
      keyExtractor={c => c.customer_email}
      contentContainerStyle={s.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />
      }
      ListHeaderComponent={
        clients.length > 0 ? (
          <Text style={s.header}>{clients.length} client{clients.length > 1 ? 's' : ''}</Text>
        ) : null
      }
      ListEmptyComponent={
        <View style={s.empty}>
          <Ionicons name="people-outline" size={36} color={colors.textFaint} />
          <Text style={s.emptyText}>Aucun client pour l'instant</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const initials = item.customer_name
          .split(' ')
          .map((p: string) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        const lastVisit = new Date(item.last_visit).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'short',
        });

        return (
          <View style={s.row}>
            {/* Rank */}
            {index < 3 && (
              <View style={[s.rankBadge, index === 0 && s.gold, index === 1 && s.silver, index === 2 && s.bronze]}>
                <Text style={s.rankText}>{index + 1}</Text>
              </View>
            )}

            {/* Avatar */}
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.customer_name}</Text>
              <Text style={s.sub}>
                {item.visits} visite{item.visits > 1 ? 's' : ''} · Dernière: {lastVisit}
              </Text>
            </View>

            {/* LTV */}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.ltv}>{formatPrice(item.ltv)}</Text>
              <Text style={s.ltvLabel}>LTV</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, backgroundColor: colors.bg, gap: spacing.sm, paddingBottom: 80 },
  header: { color: colors.textFaint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  rankBadge: {
    position: 'absolute', top: -6, left: -6,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.border, zIndex: 1,
  },
  gold:   { backgroundColor: '#f59e0b' },
  silver: { backgroundColor: '#94a3b8' },
  bronze: { backgroundColor: '#cd7c3c' },
  rankText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(59,130,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.electric, fontWeight: '700', fontSize: 15 },

  name: { color: colors.text, fontWeight: '600' },
  sub:  { color: colors.textDim, fontSize: 12, marginTop: 2 },

  ltv:      { color: colors.text, fontWeight: '700', fontSize: 15 },
  ltvLabel: { color: colors.textFaint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyText: { color: colors.textFaint, fontSize: 14 },
});
