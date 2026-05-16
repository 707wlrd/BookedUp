import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Linking, Pressable,
  ScrollView, Share, StyleSheet, Text, View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@bookedup/shared';
import { barberColorIndex, CARD_GRADIENTS, getFavorites, toggleFavorite } from '@/lib/favorites';

const { width: W } = Dimensions.get('window');
const COVER_H = 220;

type Barber = {
  id: string; shop_name: string; city: string | null;
  address: string | null; description: string | null;
  phone: string | null; instagram: string | null; facebook: string | null;
  created_at: string;
};
type Service = { id: string; name: string; duration_minutes: number; price_cents: number; description: string | null };

type Tab = 'services' | 'reviews' | 'about';

export default function BarberDetailScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();

  const [barber, setBarber]     = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('services');
  const [isFav, setIsFav]       = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const heartScale = useRef(new Animated.Value(1)).current;

  const load = useCallback(async () => {
    const [{ data: b }, { data: svcs }, favIds] = await Promise.all([
      supabase.from('barbers').select('id, shop_name, city, address, description, phone, instagram, facebook, created_at').eq('id', id).single(),
      supabase.from('services').select('id, name, duration_minutes, price_cents, description').eq('barber_id', id).eq('is_active', true).order('sort_order'),
      getFavorites(),
    ]);
    setBarber(b as Barber);
    setServices((svcs ?? []) as Service[]);
    setIsFav(favIds.includes(id));
  }, [id]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function handleFav() {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    const added = await toggleFavorite(id);
    setIsFav(added);
  }

  function handleShare() {
    if (barber) Share.share({ message: `Réserve chez ${barber.shop_name} sur BookedUp !` });
  }

  if (loading || !barber) {
    return (
      <View style={s.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  const ci = barberColorIndex(barber.id);
  const [topColor, bottomColor] = CARD_GRADIENTS[ci];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── COVER ── */}
      <View style={[s.cover, { backgroundColor: topColor, paddingTop: insets.top + 8 }]}>
        <Text style={s.coverLetter}>{barber.shop_name.charAt(0).toUpperCase()}</Text>

        {/* Header buttons */}
        <View style={[s.coverBtns, { top: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={s.coverBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable onPress={handleShare} style={s.coverBtn}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </Pressable>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Pressable onPress={handleFav} style={[s.coverBtn, isFav && s.coverBtnRed]}>
                <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? '#ef4444' : '#fff'} />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>

      {/* ── SALON INFO ── */}
      <View style={s.infoSection}>
        <Text style={s.salonName}>{barber.shop_name}</Text>
        <View style={s.starsRow}>
          {[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={14} color="#f59e0b" />)}
          <Text style={s.starsCount}>Nouveau salon</Text>
        </View>
        {(barber.address || barber.city) && (
          <View style={s.addressRow}>
            <Ionicons name="location-outline" size={14} color={colors.textFaint} />
            <Text style={s.addressTxt}>{barber.address ?? barber.city}</Text>
          </View>
        )}
      </View>

      {/* ── TAB BAR ── */}
      <View style={s.tabBar}>
        {([
          { key: 'services', label: 'Services' },
          { key: 'reviews',  label: 'Commentaires' },
          { key: 'about',    label: 'À propos de' },
        ] as { key: Tab; label: string }[]).map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[s.tabItem, tab === t.key && s.tabItemActive]}>
            <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── TAB CONTENT ── */}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* SERVICES */}
        {tab === 'services' && (
          <>
            <Text style={s.sectionTitle}>Services</Text>
            {services.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyText}>Aucune prestation disponible pour le moment.</Text>
              </View>
            ) : (
              services.map(svc => {
                const open = expanded === svc.id;
                return (
                  <View key={svc.id} style={s.accordion}>
                    <Pressable onPress={() => setExpanded(open ? null : svc.id)} style={s.accordionHeader}>
                      <Text style={s.accordionTitle}>{svc.name}</Text>
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textFaint} />
                    </Pressable>

                    {open && (
                      <View style={s.accordionBody}>
                        <View style={s.accordionMeta}>
                          <View style={s.metaPill}>
                            <Ionicons name="time-outline" size={13} color={colors.textFaint} />
                            <Text style={s.metaText}>{svc.duration_minutes} min</Text>
                          </View>
                          <Text style={s.accordionPrice}>{formatPrice(svc.price_cents)}</Text>
                        </View>
                        {svc.description ? (
                          <Text style={s.accordionDesc}>{svc.description}</Text>
                        ) : null}
                        <Pressable
                          onPress={() => router.push(`/book/${barber.id}?serviceId=${svc.id}`)}
                          style={s.bookBtn}
                        >
                          <Text style={s.bookBtnText}>Réserver</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        {/* COMMENTAIRES */}
        {tab === 'reviews' && (
          <>
            <Text style={s.sectionTitle}>Commentaires (0)</Text>
            <View style={s.ratingCard}>
              <Text style={s.ratingScore}>–/5</Text>
              <View style={s.starsRow}>
                {[1,2,3,4,5].map(i => <Ionicons key={i} name="star-outline" size={18} color={colors.textFaint} />)}
              </View>
              <View style={s.ratingBars}>
                {[5,4,3,2,1].map(n => (
                  <View key={n} style={s.ratingBarRow}>
                    <Text style={s.ratingBarLabel}>{n} étoile{n > 1 ? 's' : ''} (0)</Text>
                    <View style={s.ratingBarTrack}>
                      <View style={[s.ratingBarFill, { width: 0 }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <View style={s.emptyState}>
              <Ionicons name="chatbubble-outline" size={40} color={colors.textFaint} />
              <Text style={s.emptyText}>Aucun commentaire pour le moment.</Text>
              <Text style={s.emptySubText}>Sois le premier à laisser un avis après ton RDV !</Text>
            </View>
          </>
        )}

        {/* À PROPOS */}
        {tab === 'about' && (
          <>
            <Text style={s.sectionTitle}>À propos de</Text>

            <View style={s.aboutCard}>
              <Text style={s.aboutSalonName}>{barber.shop_name}</Text>
              {barber.description ? (
                <Text style={s.aboutDesc}>{barber.description}</Text>
              ) : (
                <Text style={s.aboutDescEmpty}>Aucune description renseignée.</Text>
              )}
            </View>

            {(barber.address || barber.city) && (
              <>
                <Text style={s.sectionTitle}>Informations</Text>
                <Pressable
                  onPress={() => {
                    const q = encodeURIComponent(barber.address ?? barber.city ?? '');
                    Linking.openURL(`https://maps.apple.com/?q=${q}`);
                  }}
                  style={s.mapPlaceholder}
                >
                  <View style={s.mapPlaceholderInner}>
                    <Ionicons name="map" size={32} color={colors.electric} />
                    <Text style={s.mapPlaceholderText}>Ouvrir dans Maps</Text>
                  </View>
                </Pressable>
                <View style={s.contactRow}>
                  <Ionicons name="location-outline" size={16} color={colors.textFaint} />
                  <Text style={s.contactText}>{barber.address ?? barber.city}</Text>
                </View>
              </>
            )}

            {/* Contact */}
            <Text style={s.sectionTitle}>Contact</Text>
            <View style={s.aboutCard}>
              {barber.phone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${barber.phone}`)} style={s.contactRow}>
                  <Ionicons name="call-outline" size={16} color={colors.electric} />
                  <Text style={[s.contactText, { color: colors.electric }]}>{barber.phone}</Text>
                </Pressable>
              ) : null}

              {barber.facebook ? (
                <Pressable onPress={() => Linking.openURL(barber.facebook!)} style={s.contactRow}>
                  <Ionicons name="logo-facebook" size={16} color={colors.electric} />
                  <Text style={[s.contactText, { color: colors.electric }]}>Ouvrir Facebook</Text>
                </Pressable>
              ) : null}

              {barber.instagram ? (
                <Pressable onPress={() => Linking.openURL(barber.instagram!)} style={s.contactRow}>
                  <Ionicons name="logo-instagram" size={16} color={colors.electric} />
                  <Text style={[s.contactText, { color: colors.electric }]}>Ouvrir Instagram</Text>
                </Pressable>
              ) : null}

              {!barber.phone && !barber.facebook && !barber.instagram && (
                <Text style={s.aboutDescEmpty}>Aucune information de contact.</Text>
              )}
            </View>
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Sticky "Prendre RDV" */}
      {tab === 'services' && services.length > 0 && (
        <View style={[s.stickyBar, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            onPress={() => router.push(`/book/${barber.id}`)}
            style={s.stickyBtn}
          >
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <Text style={s.stickyBtnText}>Prendre rendez-vous</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  cover: {
    height: COVER_H,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  coverLetter: { fontSize: 96, fontWeight: '800', color: 'rgba(255,255,255,0.18)', letterSpacing: -4 },
  coverBtns: {
    position: 'absolute', left: spacing.md, right: spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  coverBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8,
  },
  coverBtnRed: { backgroundColor: 'rgba(239,68,68,0.2)' },

  infoSection: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.bg },
  salonName:   { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 6 },
  starsRow:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  starsCount:  { color: colors.textFaint, fontSize: 12, marginLeft: 4 },
  addressRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressTxt:  { color: colors.textFaint, fontSize: 13 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: colors.electric },
  tabLabel: { color: colors.textFaint, fontSize: 13, fontWeight: '500' },
  tabLabelActive: { color: colors.text, fontWeight: '700' },

  scroll: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.md, marginTop: spacing.sm },

  accordion: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.sm, overflow: 'hidden',
  },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  accordionTitle:  { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  accordionBody:   { paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  accordionMeta:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.sm },
  metaPill:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:        { color: colors.textFaint, fontSize: 13 },
  accordionPrice:  { color: colors.text, fontWeight: '700', fontSize: 17 },
  accordionDesc:   { color: colors.textDim, fontSize: 13, lineHeight: 18, marginBottom: spacing.sm },
  bookBtn:         { backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 12, alignItems: 'center' },
  bookBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

  ratingCard:     { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  ratingScore:    { color: colors.text, fontSize: 36, fontWeight: '800' },
  ratingBars:     { gap: 6 },
  ratingBarRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingBarLabel: { color: colors.textFaint, fontSize: 12, width: 100 },
  ratingBarTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  ratingBarFill:  { height: 6, backgroundColor: colors.electric, borderRadius: 3 },

  emptyState:    { alignItems: 'center', paddingVertical: 40, gap: spacing.sm },
  emptyText:     { color: colors.textDim, fontSize: 14, textAlign: 'center', fontWeight: '500' },
  emptySubText:  { color: colors.textFaint, fontSize: 13, textAlign: 'center' },

  aboutCard:       { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  aboutSalonName:  { color: colors.text, fontWeight: '700', fontSize: 16 },
  aboutDesc:       { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  aboutDescEmpty:  { color: colors.textFaint, fontSize: 13 },
  mapPlaceholder:  { height: 140, backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  mapPlaceholderInner: { alignItems: 'center', gap: 8 },
  mapPlaceholderText:  { color: colors.electric, fontWeight: '600' },
  contactRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  contactText: { color: colors.textDim, fontSize: 14 },

  stickyBar: { backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md },
  stickyBtn: { backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  stickyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
