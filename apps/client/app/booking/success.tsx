import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '@/lib/theme';

export default function BookingSuccessScreen() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <View style={s.icon}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
      </View>

      <Text style={s.title}>Réservation confirmée !</Text>
      <Text style={s.sub}>
        Tu vas recevoir un email de confirmation avec tous les détails du rendez-vous.
      </Text>

      <Pressable onPress={() => router.push('/(tabs)/appointments')} style={s.btn}>
        <Ionicons name="calendar-outline" size={18} color="#fff" />
        <Text style={s.btnText}>Voir mes RDV</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/')} style={s.linkBtn}>
        <Text style={s.linkBtnText}>Retour à l'accueil</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon:      { marginBottom: spacing.lg },
  title:     { color: colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  sub:       { color: colors.textDim, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  btn:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 14, paddingHorizontal: 28, marginBottom: spacing.md },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkBtn:   { paddingVertical: spacing.sm },
  linkBtnText: { color: colors.textFaint, fontSize: 14 },
});
