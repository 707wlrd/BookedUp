import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, FlatList, Pressable,
  StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { barberColorIndex, CARD_GRADIENTS, getFavorites, toggleFavorite } from '@/lib/favorites';

type Barber = { id: string; shop_name: string; city: string | null; created_at: string };

export default function FavoritesScreen() {
  const [barbers, setBarbers]   = useState<Barber[]>([]);
  const [favIds, setFavIds]     = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    const ids = await getFavorites();
    setFavIds(new Set(ids));
    if (ids.length === 0) { setBarbers([]); return; }
    const { data } = await supabase
      .from('barbers')
      .select('id, shop_name, city, created_at')
      .in('id', ids);
    setBarbers((data ?? []) as Barber[]);
  }, []);

  // Reload when tab gains focus (in case favorites changed on home screen)
  useFocusEffect(useCallback(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]));

  async function handleUnfav(id: string) {
    await toggleFavorite(id);
    setFavIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    setBarbers(prev => prev.filter(b => b.id !== id));
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  if (barbers.length === 0) {
    return (
      <View style={s.centered}>
        <Ionicons name="heart-outline" size={56} color={colors.textFaint} />
        <Text style={s.emptyTitle}>Aucun favori</Text>
        <Text style={s.emptySub}>
          Appuie sur ❤️ sur un salon pour le sauvegarder ici.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={barbers}
      keyExtractor={b => b.id}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={s.list}
      renderItem={({ item }) => {
        const ci = barberColorIndex(item.id);
        const [topColor] = CARD_GRADIENTS[ci];
        return (
          <Link href={`/barber/${item.id}`} asChild>
            <Pressable style={s.card}>
              {/* Cover */}
              <View style={[s.cover, { backgroundColor: topColor }]}>
                <Text style={s.coverLetter}>{item.shop_name.charAt(0).toUpperCase()}</Text>
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); handleUnfav(item.id); }}
                  style={s.heartBtn}
                  hitSlop={10}
                >
                  <Ionicons name="heart" size={22} color="#ef4444" />
                </Pressable>
              </View>
              {/* Name */}
              <View style={s.cardBody}>
                <Text style={s.cardName}>{item.shop_name}</Text>
                {item.city ? (
                  <View style={s.cityRow}>
                    <Ionicons name="location-outline" size={13} color={colors.textFaint} />
                    <Text style={s.cityText}>{item.city}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </Link>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySub:   { color: colors.textFaint, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cover: { height: 160, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  coverLetter: { fontSize: 64, fontWeight: '800', color: 'rgba(255,255,255,0.2)' },
  heartBtn: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20, padding: 8 },
  cardBody: { padding: spacing.md },
  cardName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cityRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cityText: { color: colors.textFaint, fontSize: 13 },
});
