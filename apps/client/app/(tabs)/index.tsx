import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type Barber = {
  id: string;
  shop_name: string;
  city: string | null;
  description: string | null;
  avatar_url: string | null;
};

export default function HomeScreen() {
  const [barbers, setBarbers]     = useState<Barber[]>([]);
  const [filtered, setFiltered]   = useState<Barber[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('barbers')
      .select('id, shop_name, city, description, avatar_url')
      .order('shop_name');
    const list = (data ?? []) as Barber[];
    setBarbers(list);
    setFiltered(list);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      barbers.filter(b =>
        b.shop_name.toLowerCase().includes(q) ||
        (b.city ?? '').toLowerCase().includes(q),
      ),
    );
  }, [search, barbers]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Search bar */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textFaint} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un salon, une ville…"
          placeholderTextColor={colors.textFaint}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={b => b.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />
        }
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Text style={s.sectionLabel}>
              {search ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}` : 'Tous les salons'}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="storefront-outline" size={40} color={colors.textFaint} />
            <Text style={s.emptyTitle}>Aucun salon trouvé</Text>
            <Text style={s.emptySub}>Essaie un autre terme de recherche.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Link href={`/barber/${item.id}`} asChild>
            <Pressable style={s.card}>
              {/* Avatar placeholder */}
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {item.shop_name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={s.shopName}>{item.shop_name}</Text>
                {item.city ? (
                  <View style={s.cityRow}>
                    <Ionicons name="location-outline" size={12} color={colors.textFaint} />
                    <Text style={s.city}>{item.city}</Text>
                  </View>
                ) : null}
                {item.description ? (
                  <Text style={s.desc} numberOfLines={2}>{item.description}</Text>
                ) : null}
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    gap: spacing.sm,
  },
  searchIcon:  {},
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },

  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  sectionLabel: {
    color: colors.textFaint, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: radius.lg,
    backgroundColor: colors.electricDim,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { color: colors.electric, fontSize: 20, fontWeight: '700' },
  shopName:   { color: colors.text, fontWeight: '700', fontSize: 15 },
  cityRow:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  city:       { color: colors.textFaint, fontSize: 12 },
  desc:       { color: colors.textDim, fontSize: 12, marginTop: 4, lineHeight: 17 },

  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
  emptySub:   { color: colors.textFaint, fontSize: 13 },
});
