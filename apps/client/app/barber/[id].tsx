import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@bookedup/shared';

type Barber = {
  id: string;
  shop_name: string;
  city: string | null;
  description: string | null;
  address: string | null;
};

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  description: string | null;
};

export default function BarberScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const [barber, setBarber]     = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    const [{ data: b }, { data: svcs }] = await Promise.all([
      supabase.from('barbers').select('id, shop_name, city, description, address').eq('id', id).single(),
      supabase.from('services').select('id, name, duration_minutes, price_cents, description').eq('barber_id', id).eq('is_active', true).order('sort_order'),
    ]);
    setBarber(b as Barber);
    setServices((svcs ?? []) as Service[]);
  }, [id]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  if (!barber) {
    return (
      <View style={s.centered}>
        <Text style={{ color: colors.textFaint }}>Salon introuvable.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: barber.shop_name }} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroAvatar}>
            <Text style={s.heroAvatarText}>{barber.shop_name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.heroName}>{barber.shop_name}</Text>
          {barber.city && (
            <View style={s.heroCity}>
              <Ionicons name="location-outline" size={14} color={colors.textFaint} />
              <Text style={s.heroCityText}>{barber.city}</Text>
            </View>
          )}
          {barber.address && (
            <Text style={s.heroAddress}>{barber.address}</Text>
          )}
          {barber.description && (
            <Text style={s.heroDesc}>{barber.description}</Text>
          )}
        </View>

        {/* Services */}
        <Text style={s.sectionLabel}>Prestations</Text>

        {services.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Aucune prestation disponible pour l'instant.</Text>
          </View>
        ) : (
          services.map((svc) => (
            <View key={svc.id} style={s.serviceCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.svcName}>{svc.name}</Text>
                {svc.description ? <Text style={s.svcDesc}>{svc.description}</Text> : null}
                <View style={s.svcMeta}>
                  <Ionicons name="time-outline" size={12} color={colors.textFaint} />
                  <Text style={s.svcMetaText}>{svc.duration_minutes} min</Text>
                </View>
              </View>
              <View style={s.svcRight}>
                <Text style={s.svcPrice}>{formatPrice(svc.price_cents)}</Text>
                <Pressable
                  onPress={() => router.push(`/book/${barber.id}?serviceId=${svc.id}`)}
                  style={s.bookBtn}
                >
                  <Text style={s.bookBtnText}>Réserver</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.bg },
  content:  { padding: spacing.md, paddingBottom: 80 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  hero:           { alignItems: 'center', paddingVertical: spacing.lg, marginBottom: spacing.lg },
  heroAvatar:     { width: 80, height: 80, borderRadius: 20, backgroundColor: colors.electricDim, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  heroAvatarText: { color: colors.electric, fontSize: 32, fontWeight: '700' },
  heroName:       { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  heroCity:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  heroCityText:   { color: colors.textFaint, fontSize: 13 },
  heroAddress:    { color: colors.textFaint, fontSize: 12, marginTop: 4, textAlign: 'center' },
  heroDesc:       { color: colors.textDim, fontSize: 14, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 },

  sectionLabel: { color: colors.textFaint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },

  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  svcName:     { color: colors.text, fontWeight: '600', fontSize: 15 },
  svcDesc:     { color: colors.textDim, fontSize: 12, marginTop: 3 },
  svcMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  svcMetaText: { color: colors.textFaint, fontSize: 12 },
  svcRight:    { alignItems: 'flex-end', gap: spacing.sm },
  svcPrice:    { color: colors.text, fontWeight: '700', fontSize: 16 },
  bookBtn:     { backgroundColor: colors.electric, borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 8 },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  empty:     { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { color: colors.textFaint },
});
