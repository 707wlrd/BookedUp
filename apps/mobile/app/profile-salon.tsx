import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type Form = {
  shop_name: string;
  bio: string;
  address: string;
  city: string;
  phone: string;
  instagram_handle: string;
};

export default function ProfileSalonScreen() {
  const router = useRouter();
  const [form, setForm]       = useState<Form>({ shop_name: '', bio: '', address: '', city: '', phone: '', instagram_handle: '' });
  const [barberId, setBarberId] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: barber } = await supabase
        .from('barbers')
        .select('id, shop_name, bio, address, city, phone, instagram_handle')
        .eq('owner_id', user.id)
        .single();
      if (barber) {
        setBarberId(barber.id);
        setForm({
          shop_name:        barber.shop_name        ?? '',
          bio:              barber.bio               ?? '',
          address:          barber.address           ?? '',
          city:             barber.city              ?? '',
          phone:            barber.phone             ?? '',
          instagram_handle: barber.instagram_handle  ?? '',
        });
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!form.shop_name.trim()) { Alert.alert('Erreur', 'Le nom du salon est obligatoire.'); return; }
    if (!barberId) return;
    setSaving(true);
    const { error } = await supabase.from('barbers').update({
      shop_name:        form.shop_name.trim(),
      bio:              form.bio.trim()               || null,
      address:          form.address.trim()           || null,
      city:             form.city.trim()              || null,
      phone:            form.phone.trim()             || null,
      instagram_handle: form.instagram_handle.trim()  || null,
    }).eq('id', barberId);
    setSaving(false);
    if (error) Alert.alert('Erreur', error.message);
    else { Alert.alert('Sauvegardé ✓', ''); router.back(); }
  }

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.electric} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        <View style={s.card}>
          <Field label="Nom du salon *" value={form.shop_name} onChangeText={v => setForm(f => ({ ...f, shop_name: v }))} placeholder="Barbershop Elite" />
          <Field label="Description" value={form.bio} onChangeText={v => setForm(f => ({ ...f, bio: v }))} placeholder="Spécialisé en dégradés, designs sur mesure..." multiline />
        </View>

        <View style={s.card}>
          <Field label="Adresse" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} placeholder="12 rue de la Paix" />
          <Field label="Ville" value={form.city} onChangeText={v => setForm(f => ({ ...f, city: v }))} placeholder="Bruxelles" last />
        </View>

        <View style={s.card}>
          <Field label="Téléphone" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} placeholder="+32 470 12 34 56" keyboardType="phone-pad" />
          <Field label="Instagram (sans @)" value={form.instagram_handle} onChangeText={v => setForm(f => ({ ...f, instagram_handle: v.replace('@', '') }))} placeholder="monsalon" autoCapitalize="none" last />
        </View>

        <Pressable onPress={save} disabled={saving} style={[s.btn, saving && { opacity: 0.6 }]}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>Enregistrer</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize, last }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
  multiline?: boolean; keyboardType?: any; autoCapitalize?: any; last?: boolean;
}) {
  return (
    <View style={[s.field, !last && s.fieldBorder]}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.bg },
  content:  { padding: spacing.md, gap: spacing.md, paddingBottom: 60 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  card:        { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  field:       { padding: spacing.md },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label:       { color: colors.textFaint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input:       { color: colors.text, fontSize: 15 },
  inputMulti:  { minHeight: 70, textAlignVertical: 'top' },

  btn:     { backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
