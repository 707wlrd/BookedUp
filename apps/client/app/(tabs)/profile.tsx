import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      setName(user.user_metadata?.full_name ?? '');
      setPhone(user.user_metadata?.phone ?? '');
      setLoading(false);
    }
    load();
  }, []);

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim(), phone: phone.trim() },
    });
    setSaving(false);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      setEditing(false);
    }
  }

  async function signOut() {
    Alert.alert('Déconnexion', 'Tu vas être déconnecté.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
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
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      {/* Avatar */}
      <View style={s.avatarWrap}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={s.nameLabel}>{name || 'Mon compte'}</Text>
        <Text style={s.emailLabel}>{email}</Text>
      </View>

      {/* Profile card */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Informations personnelles</Text>
          {!editing && (
            <Pressable onPress={() => setEditing(true)} style={s.editBtn}>
              <Ionicons name="pencil-outline" size={14} color={colors.electric} />
              <Text style={s.editBtnText}>Modifier</Text>
            </Pressable>
          )}
        </View>

        <View style={s.field}>
          <Text style={s.label}>Prénom</Text>
          {editing ? (
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Ton prénom"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="words"
            />
          ) : (
            <Text style={s.value}>{name || '—'}</Text>
          )}
        </View>

        <View style={s.field}>
          <Text style={s.label}>Email</Text>
          <Text style={s.value}>{email}</Text>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Téléphone</Text>
          {editing ? (
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+33 6 12 34 56 78"
              placeholderTextColor={colors.textFaint}
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={s.value}>{phone || '—'}</Text>
          )}
        </View>

        {editing && (
          <View style={s.editActions}>
            <Pressable onPress={() => setEditing(false)} style={s.cancelBtn}>
              <Text style={s.cancelText}>Annuler</Text>
            </Pressable>
            <Pressable onPress={saveProfile} disabled={saving} style={s.saveBtn}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.saveBtnText}>Enregistrer</Text>
              }
            </Pressable>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={s.card}>
        <Pressable onPress={signOut} style={s.actionRow}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={[s.actionText, { color: colors.danger }]}>Déconnexion</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.bg },
  content:  { padding: spacing.md, paddingBottom: 80, gap: spacing.md },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  avatarWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar:     { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.electricDim, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText: { color: colors.electric, fontSize: 28, fontWeight: '700' },
  nameLabel:  { color: colors.text, fontSize: 20, fontWeight: '700' },
  emailLabel: { color: colors.textFaint, fontSize: 13, marginTop: 4 },

  card:       { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  cardTitle:  { color: colors.text, fontWeight: '600', fontSize: 15 },
  editBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(124,58,237,0.35)' },
  editBtnText: { color: colors.electric, fontSize: 12, fontWeight: '500' },

  field:  { marginBottom: spacing.md },
  label:  { color: colors.textFaint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  value:  { color: colors.text, fontSize: 15 },
  input:  { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.text, fontSize: 15 },

  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn:   { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  cancelText:  { color: colors.textDim, fontWeight: '600' },
  saveBtn:     { flex: 2, paddingVertical: 12, alignItems: 'center', borderRadius: radius.full, backgroundColor: colors.electric },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  actionText: { fontSize: 15, fontWeight: '500' },
});
