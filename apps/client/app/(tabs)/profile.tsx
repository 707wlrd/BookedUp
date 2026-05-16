import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type User = { name: string; email: string; initials: string };

function getInitials(name: string, email: string) {
  if (name) {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        const name = u.user_metadata?.full_name ?? '';
        setUser({ name, email: u.email ?? '', initials: getInitials(name, u.email ?? '') });
      }
      setLoading(false);
    });
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

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Avatar */}
      {user && (
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user.initials}</Text>
          </View>
          <Text style={s.userName}>{user.name || 'Mon compte'}</Text>
          <Text style={s.userEmail}>{user.email}</Text>
        </View>
      )}

      {/* Votre activité */}
      <Text style={s.sectionTitle}>Votre activité</Text>
      <View style={s.section}>
        <MenuItem
          icon="star-outline"
          label="Mes avis"
          onPress={() => Alert.alert('Bientôt disponible')}
        />
        <MenuItem
          icon="heart-outline"
          label="Mes favoris"
          onPress={() => router.push('/(tabs)/favorites')}
          showDivider={false}
        />
      </View>

      {/* Paramètres du compte */}
      <Text style={s.sectionTitle}>Paramètres du compte</Text>
      <View style={s.section}>
        <MenuItem
          icon="person-outline"
          label="Informations de profil"
          onPress={() => router.push('/profile/edit')}
        />
        <MenuItem
          icon="notifications-outline"
          label="Notifications"
          onPress={() => Alert.alert('Bientôt disponible')}
        />
        <MenuItem
          icon="globe-outline"
          label="Langue (FR)"
          onPress={() => Alert.alert('Bientôt disponible')}
          showDivider={false}
        />
      </View>

      {/* Légal */}
      <Text style={s.sectionTitle}>Légal</Text>
      <View style={s.section}>
        <MenuItem
          icon="document-text-outline"
          label="Conditions d'utilisation"
          onPress={() => Alert.alert('Bientôt disponible')}
        />
        <MenuItem
          icon="shield-outline"
          label="Politique de confidentialité"
          onPress={() => Alert.alert('Bientôt disponible')}
          showDivider={false}
        />
      </View>

      {/* Aide */}
      <View style={s.section}>
        <MenuItem
          icon="information-circle-outline"
          label="Aide"
          value="v0.1.0"
          onPress={() => Alert.alert('BookedUp', 'Version 0.1.0\nContact : hello@bookedup.app')}
          showDivider={false}
        />
      </View>

      {/* Déconnexion */}
      <Pressable onPress={signOut} style={s.signOutRow}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={s.signOutText}>Se déconnecter</Text>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function MenuItem({
  icon, label, value, onPress, showDivider = true,
}: {
  icon: any; label: string; value?: string;
  onPress: () => void; showDivider?: boolean;
}) {
  return (
    <>
      <Pressable onPress={onPress} style={s.menuItem}>
        <View style={s.menuIcon}>
          <Ionicons name={icon} size={18} color={colors.electric} />
        </View>
        <Text style={s.menuLabel}>{label}</Text>
        <View style={s.menuRight}>
          {value ? <Text style={s.menuValue}>{value}</Text> : null}
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </View>
      </Pressable>
      {showDivider && <View style={s.menuDivider} />}
    </>
  );
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.bg },
  content:  { padding: spacing.md, paddingBottom: 80 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  avatarSection: { alignItems: 'center', paddingVertical: spacing.xl },
  avatar:     { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.electricDim, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, borderWidth: 2, borderColor: 'rgba(124,58,237,0.4)' },
  avatarText: { color: colors.electric, fontSize: 26, fontWeight: '800' },
  userName:   { color: colors.text, fontSize: 20, fontWeight: '700' },
  userEmail:  { color: colors.textFaint, fontSize: 13, marginTop: 4 },

  sectionTitle: { color: colors.textFaint, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md, paddingHorizontal: 4 },

  section: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, overflow: 'hidden' },

  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 15, gap: spacing.md },
  menuIcon: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.electricDim, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { color: colors.textFaint, fontSize: 13 },
  menuDivider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },

  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', padding: spacing.md, marginTop: spacing.sm },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
