import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type Info = { name: string; email: string; shopName: string; city: string };

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [info, setInfo]     = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const name = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '';
      const { data: barber } = await supabase.from('barbers').select('shop_name, city').eq('owner_id', user.id).single();
      setInfo({ name, email: user.email ?? '', shopName: barber?.shop_name ?? '', city: barber?.city ?? '' });
      setLoading(false);
    })();
  }, []);

  function signOut() {
    Alert.alert('Déconnexion', 'Tu vas être déconnecté.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  const initials = getInitials(info?.name || info?.email || '?');

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Back ── */}
      <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
        <Text style={s.backText}>Retour</Text>
      </Pressable>

      {/* ── Avatar + info ── */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.nameText}>{info?.name || 'Mon compte'}</Text>
        {info?.shopName ? <Text style={s.shopText}>{info.shopName}</Text> : null}
        {info?.city ? (
          <View style={s.cityRow}>
            <Ionicons name="location-outline" size={12} color={colors.textFaint} />
            <Text style={s.cityText}>{info.city}</Text>
          </View>
        ) : null}
        <Text style={s.emailText}>{info?.email}</Text>
      </View>

      {/* ── Salon ── */}
      <Text style={s.sectionLabel}>Mon salon</Text>
      <View style={s.section}>
        <MenuItem icon="storefront-outline"  label="Informations du salon"   onPress={() => router.push('/profile-salon' as any)} />
        <MenuItem icon="time-outline"        label="Horaires d'ouverture"    onPress={() => router.push('/profile-hours' as any)} />
        <MenuItem icon="cut-outline"         label="Prestations & tarifs"    onPress={() => router.push('/profile-services' as any)} />
        <MenuItem icon="people-outline"      label="Équipe / Stylistes"      onPress={() => router.push('/profile-stylists' as any)} showDivider={false} />
      </View>

      {/* ── Compte ── */}
      <Text style={s.sectionLabel}>Compte</Text>
      <View style={s.section}>
        <MenuItem icon="person-outline"        label="Informations personnelles" onPress={() => router.push('/profile-personal' as any)} />
        <MenuItem icon="card-outline"          label="Abonnement & facturation"  onPress={() => Linking.openURL('https://booked-up-web.vercel.app/studio/settings')} value="Pro" />
        <MenuItem icon="notifications-outline" label="Notifications"             onPress={() => Alert.alert('Notifications activées ✓', 'Tu reçois les alertes de nouvelles réservations et annulations.')} showDivider={false} />
      </View>

      {/* ── Aide ── */}
      <Text style={s.sectionLabel}>Aide</Text>
      <View style={s.section}>
        <MenuItem icon="help-circle-outline"   label="Centre d'aide"            onPress={() => Linking.openURL('https://booked-up-web.vercel.app')} />
        <MenuItem icon="chatbubble-outline"    label="Nous contacter"           onPress={() => Linking.openURL('mailto:hello@bookedup.app')} />
        <MenuItem icon="document-text-outline" label="Conditions d'utilisation" onPress={() => Linking.openURL('https://booked-up-web.vercel.app')} showDivider={false} />
      </View>

      {/* ── Version ── */}
      <View style={s.section}>
        <MenuItem icon="information-circle-outline" label="Version" value="v0.1.0" onPress={() => {}} showDivider={false} />
      </View>

      {/* ── Sign out ── */}
      <Pressable onPress={signOut} style={s.signOutBtn}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={s.signOutText}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

function MenuItem({ icon, label, value, onPress, showDivider = true }: {
  icon: any; label: string; value?: string; onPress: () => void; showDivider?: boolean;
}) {
  return (
    <>
      <Pressable onPress={onPress} style={s.menuItem}>
        <View style={s.menuIconBox}>
          <Ionicons name={icon} size={17} color={colors.electric} />
        </View>
        <Text style={s.menuLabel}>{label}</Text>
        <View style={s.menuRight}>
          {value ? <Text style={s.menuValue}>{value}</Text> : null}
          <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
        </View>
      </Pressable>
      {showDivider && <View style={s.divider} />}
    </>
  );
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.bg },
  content:  { paddingHorizontal: spacing.md, gap: spacing.sm },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  backText: { color: colors.text, fontSize: 16 },

  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg, gap: 4 },
  avatar:      { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.electricDim, borderWidth: 2, borderColor: 'rgba(124,58,237,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText:  { color: colors.electric, fontSize: 28, fontWeight: '900' },
  nameText:    { color: colors.text, fontSize: 20, fontWeight: '800' },
  shopText:    { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  cityRow:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cityText:    { color: colors.textFaint, fontSize: 12 },
  emailText:   { color: colors.textFaint, fontSize: 12 },

  sectionLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4, marginTop: spacing.sm },
  section:      { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },

  menuItem:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14, gap: spacing.md },
  menuIconBox:{ width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.electricDim, alignItems: 'center', justifyContent: 'center' },
  menuLabel:  { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },
  menuRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuValue:  { color: colors.textFaint, fontSize: 13 },
  divider:    { height: 1, backgroundColor: colors.border, marginLeft: 62 },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', padding: spacing.md, marginTop: spacing.sm },
  signOutText:{ color: colors.danger, fontSize: 14, fontWeight: '600' },
});
