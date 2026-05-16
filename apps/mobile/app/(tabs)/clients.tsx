import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TextInput, View, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/lib/theme';
import { formatPrice } from '@bookedup/shared';
import { supabase } from '@/lib/supabase';

type Client = {
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  visits: number;
  ltv: number;
  last_visit: string;
};

const AVATAR_COLORS = [
  ['#7c3aed', 'rgba(124,58,237,0.15)'],
  ['#2563eb', 'rgba(37,99,235,0.15)'],
  ['#059669', 'rgba(5,150,105,0.15)'],
  ['#d97706', 'rgba(217,119,6,0.15)'],
  ['#dc2626', 'rgba(220,38,38,0.15)'],
];

function avatarColor(email: string) {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7)  return `Il y a ${days} j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`;
}

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const [clients,    setClients]    = useState<Client[]>([]);
  const [filtered,   setFiltered]   = useState<Client[]>([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: barber } = await supabase
      .from('barbers').select('id').eq('owner_id', user.id).single();
    if (!barber) return;

    const { data } = await supabase
      .from('appointments')
      .select('customer_name, customer_email, customer_phone, price_cents, starts_at, status')
      .eq('barber_id', barber.id)
      .in('status', ['confirmed', 'completed'])
      .order('starts_at', { ascending: false });

    const map: Record<string, Client> = {};
    for (const a of data ?? []) {
      const key = a.customer_email;
      if (!map[key]) {
        map[key] = { customer_name: a.customer_name, customer_email: key, customer_phone: a.customer_phone, visits: 0, ltv: 0, last_visit: a.starts_at };
      }
      map[key].visits += 1;
      map[key].ltv += a.price_cents;
      if (a.starts_at > map[key].last_visit) map[key].last_visit = a.starts_at;
    }

    const sorted = Object.values(map).sort((a, b) => b.visits - a.visits);
    setClients(sorted);
    setFiltered(sorted);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function onSearch(text: string) {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(q
      ? clients.filter(c =>
          c.customer_name.toLowerCase().includes(q) ||
          c.customer_email.toLowerCase().includes(q))
      : clients);
  }

  const totalLtv = clients.reduce((s, c) => s + c.ltv, 0);

  if (loading) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.title}>Clients</Text>
        <Text style={s.subtitle}>{clients.length} clients · {formatPrice(totalLtv)} CA total</Text>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.textFaint} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={onSearch}
          placeholder="Rechercher un client..."
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={c => c.customer_email}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={44} color={colors.textFaint} />
            <Text style={s.emptyTitle}>{search ? 'Aucun résultat' : 'Aucun client'}</Text>
            <Text style={s.emptySub}>{search ? 'Essaie un autre nom.' : 'Les clients apparaîtront ici après leur premier RDV.'}</Text>
          </View>
        }
        renderItem={({ item: c }) => {
          const [fg, bg] = avatarColor(c.customer_email);
          return (
            <View style={s.card}>
              {/* Avatar */}
              <View style={[s.avatar, { backgroundColor: bg }]}>
                <Text style={[s.avatarText, { color: fg }]}>{getInitials(c.customer_name)}</Text>
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={s.clientName}>{c.customer_name}</Text>
                <Text style={s.clientEmail}>{c.customer_email}</Text>
                {c.customer_phone ? <Text style={s.clientPhone}>{c.customer_phone}</Text> : null}
                <View style={s.metaRow}>
                  <View style={s.metaPill}>
                    <Ionicons name="calendar-outline" size={10} color={colors.textFaint} />
                    <Text style={s.metaPillText}>{c.visits} visite{c.visits > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={s.metaPill}>
                    <Ionicons name="time-outline" size={10} color={colors.textFaint} />
                    <Text style={s.metaPillText}>{relativeDate(c.last_visit)}</Text>
                  </View>
                </View>
              </View>

              {/* LTV */}
              <View style={s.ltvCol}>
                <Text style={s.ltvAmount}>{formatPrice(c.ltv)}</Text>
                <Text style={s.ltvLabel}>LTV</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered:  { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  header:   { paddingHorizontal: spacing.md, paddingTop: 16, paddingBottom: 8 },
  title:    { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textFaint, fontSize: 12, marginTop: 2 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },

  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  avatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 14 },
  clientName: { color: colors.text, fontWeight: '600', fontSize: 14 },
  clientEmail:{ color: colors.textFaint, fontSize: 11, marginTop: 1 },
  clientPhone:{ color: colors.textFaint, fontSize: 11 },
  metaRow:    { flexDirection: 'row', gap: 6, marginTop: 6 },
  metaPill:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  metaPillText: { color: colors.textFaint, fontSize: 10 },
  ltvCol:     { alignItems: 'flex-end', gap: 2 },
  ltvAmount:  { color: colors.electric, fontWeight: '800', fontSize: 15 },
  ltvLabel:   { color: colors.textFaint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },

  empty:      { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
  emptySub:   { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
});
