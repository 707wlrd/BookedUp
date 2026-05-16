import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, FlatList, Pressable,
  RefreshControl, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import {
  barberColorIndex, CARD_GRADIENTS,
  getFavorites, toggleFavorite,
} from '@/lib/favorites';

type Barber = {
  id: string;
  shop_name: string;
  city: string | null;
  address: string | null;
  description: string | null;
  created_at: string;
};

type BarberWithServices = Barber & {
  services: { name: string; category?: string }[];
};

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 30 * 24 * 3600 * 1000;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [barbers, setBarbers]   = useState<BarberWithServices[]>([]);
  const [filtered, setFiltered] = useState<BarberWithServices[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites]   = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const [{ data: bs }, favIds] = await Promise.all([
      supabase.from('barbers').select('id, shop_name, city, address, description, created_at').order('shop_name'),
      getFavorites(),
    ]);
    setFavorites(new Set(favIds));

    if (!bs) return;

    // Fetch top 3 services per barber
    const barberIds = bs.map(b => b.id);
    const { data: svcs } = await supabase
      .from('services')
      .select('barber_id, name')
      .in('barber_id', barberIds)
      .eq('is_active', true)
      .order('sort_order')
      .limit(barberIds.length * 5);

    const svcMap: Record<string, { name: string }[]> = {};
    for (const s of svcs ?? []) {
      if (!svcMap[s.barber_id]) svcMap[s.barber_id] = [];
      if (svcMap[s.barber_id].length < 3) svcMap[s.barber_id].push({ name: s.name });
    }

    const list = (bs as Barber[]).map(b => ({ ...b, services: svcMap[b.id] ?? [] }));
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
    if (!search) { setFiltered(barbers); return; }
    const q = search.toLowerCase();
    setFiltered(barbers.filter(b =>
      b.shop_name.toLowerCase().includes(q) ||
      (b.city ?? '').toLowerCase().includes(q),
    ));
  }, [search, barbers]);

  async function handleFavorite(id: string) {
    const now = await toggleFavorite(id);
    setFavorites(prev => {
      const s = new Set(prev);
      now ? s.add(id) : s.delete(id);
      return s;
    });
  }

  if (loading) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Search header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>BookedUp</Text>
        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color={colors.textFaint} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Services et salons"
            placeholderTextColor={colors.textFaint}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={b => b.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="storefront-outline" size={48} color={colors.textFaint} />
            <Text style={s.emptyTitle}>Aucun salon trouvé</Text>
            <Text style={s.emptySub}>Essaie un autre terme.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <SalonCard
            item={item}
            isFav={favorites.has(item.id)}
            onFav={() => handleFavorite(item.id)}
          />
        )}
      />
    </View>
  );
}

function SalonCard({
  item, isFav, onFav,
}: {
  item: BarberWithServices;
  isFav: boolean;
  onFav: () => void;
}) {
  const ci = barberColorIndex(item.id);
  const [topColor, bottomColor] = CARD_GRADIENTS[ci];
  const heartScale = useRef(new Animated.Value(1)).current;

  function pressHeart() {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1.0, useNativeDriver: true }),
    ]).start();
    onFav();
  }

  return (
    <Link href={`/barber/${item.id}`} asChild>
      <Pressable style={s.card}>
        {/* Cover photo area */}
        <View style={[s.cardCover, { backgroundColor: topColor }]}>
          <Text style={s.cardCoverLetter}>
            {item.shop_name.charAt(0).toUpperCase()}
          </Text>

          {isNew(item.created_at) && (
            <View style={s.newBadge}>
              <Text style={s.newBadgeText}>NOUVEAU</Text>
            </View>
          )}

          <Animated.View style={[s.heartBtn, { transform: [{ scale: heartScale }] }]}>
            <Pressable onPress={(e) => { e.stopPropagation?.(); pressHeart(); }} hitSlop={10}>
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={22}
                color={isFav ? '#ef4444' : '#fff'}
              />
            </Pressable>
          </Animated.View>
        </View>

        {/* Card body */}
        <View style={s.cardBody}>
          <Text style={s.cardName}>{item.shop_name}</Text>

          {/* Stars placeholder — 5 stars for now */}
          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => (
              <Ionicons key={i} name="star" size={13} color="#f59e0b" />
            ))}
            <Text style={s.starsCount}>Nouveau salon</Text>
          </View>

          {(item.city || item.address) && (
            <View style={s.addressRow}>
              <Ionicons name="location-outline" size={13} color={colors.textFaint} />
              <Text style={s.addressText} numberOfLines={1}>
                {item.address ?? item.city}
              </Text>
            </View>
          )}

          {item.services.length > 0 && (
            <>
              <View style={s.divider} />
              {item.services.map((sv, i) => (
                <View key={i} style={s.serviceRow}>
                  <Text style={s.serviceName}>{sv.name}</Text>
                </View>
              ))}
              {item.services.length >= 3 && (
                <Text style={s.seeMore}>Voir plus</Text>
              )}
            </>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.sm },
  headerTitle: { color: colors.electric, fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: spacing.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 13,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },

  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },

  cardCover: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardCoverLetter: {
    fontSize: 72,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: -2,
  },
  newBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: '#fff',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newBadgeText: { color: '#111', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  heartBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    padding: 8,
  },

  cardBody: { padding: spacing.md },
  cardName: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },

  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  starsCount: { color: colors.textFaint, fontSize: 12, marginLeft: 4 },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  addressText: { color: colors.textFaint, fontSize: 13, flex: 1 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },

  serviceRow: { paddingVertical: 3 },
  serviceName: { color: colors.textDim, fontSize: 14, fontWeight: '500' },

  seeMore: { color: colors.electric, fontSize: 13, fontWeight: '600', marginTop: spacing.xs },

  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { color: colors.textDim, fontSize: 18, fontWeight: '700' },
  emptySub:   { color: colors.textFaint, fontSize: 14 },
});
