import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export default function EditProfileScreen() {
  const router = useRouter();
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setName(user.user_metadata?.full_name ?? '');
        setPhone(user.user_metadata?.phone ?? '');
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    if (!name.trim()) { Alert.alert('Erreur', 'Le prénom est obligatoire.'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim(), phone: phone.trim() },
    });
    setSaving(false);
    if (error) Alert.alert('Erreur', error.message);
    else router.back();
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Mon profil', headerBackTitle: 'Profil' }} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <View style={s.field}>
            <Text style={s.label}>Prénom</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Karim" placeholderTextColor={colors.textFaint} autoCapitalize="words" />
          </View>
          <View style={s.field}>
            <Text style={s.label}>Téléphone</Text>
            <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+33 6 12 34 56 78" placeholderTextColor={colors.textFaint} keyboardType="phone-pad" />
          </View>
        </View>

        <Pressable onPress={save} disabled={saving} style={[s.btn, saving && { opacity: 0.6 }]}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>Enregistrer</Text>}
        </Pressable>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.bg },
  content:  { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  card:     { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  field:    { marginBottom: spacing.md },
  label:    { color: colors.textFaint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input:    { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.text, fontSize: 15 },
  btn:      { backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center' },
  btnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
