import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type Stylist = { id: string; name: string; bio: string | null; specialties: string[]; is_active: boolean; sort_order: number };
type Form = { name: string; bio: string; specialties: string };

const EMPTY_FORM: Form = { name: '', bio: '', specialties: '' };

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

export default function ProfileStylistsScreen() {
  const [stylists,   setStylists]   = useState<Stylist[]>([]);
  const [barberId,   setBarberId]   = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState<Stylist | null>(null);
  const [form,       setForm]       = useState<Form>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: barber } = await supabase.from('barbers').select('id').eq('owner_id', user.id).single();
    if (!barber) return;
    setBarberId(barber.id);
    const { data } = await supabase.from('stylists').select('*').eq('barber_id', barber.id).order('sort_order');
    setStylists((data ?? []) as Stylist[]);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setModal(true); }
  function openEdit(sty: Stylist) {
    setEditing(sty);
    setForm({ name: sty.name, bio: sty.bio ?? '', specialties: sty.specialties?.join(', ') ?? '' });
    setModal(true);
  }

  async function save() {
    if (!form.name.trim()) { Alert.alert('Erreur', 'Le nom est obligatoire.'); return; }
    if (!barberId) return;
    setSaving(true);
    const specialties = form.specialties.split(',').map(s => s.trim()).filter(Boolean);
    if (editing) {
      await supabase.from('stylists').update({ name: form.name.trim(), bio: form.bio.trim() || null, specialties }).eq('id', editing.id);
    } else {
      const maxOrder = stylists.reduce((m, s) => Math.max(m, s.sort_order), -1);
      await supabase.from('stylists').insert({ barber_id: barberId, name: form.name.trim(), bio: form.bio.trim() || null, specialties, is_active: true, sort_order: maxOrder + 1 });
    }
    setSaving(false);
    setModal(false);
    await load();
  }

  async function toggleActive(sty: Stylist) {
    await supabase.from('stylists').update({ is_active: !sty.is_active }).eq('id', sty.id);
    setStylists(prev => prev.map(s => s.id === sty.id ? { ...s, is_active: !s.is_active } : s));
  }

  async function deleteStyleist(sty: Stylist) {
    Alert.alert('Supprimer', `Supprimer "${sty.name}" de l'équipe ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await supabase.from('stylists').delete().eq('id', sty.id);
        setStylists(prev => prev.filter(s => s.id !== sty.id));
      }},
    ]);
  }

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.electric} size="large" /></View>;
  }

  return (
    <>
      <View style={s.container}>
        <FlatList
          data={stylists}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />}
          ListHeaderComponent={
            <Pressable onPress={openAdd} style={s.addBtn}>
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={s.addBtnText}>Ajouter un membre</Text>
            </Pressable>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={44} color={colors.textFaint} />
              <Text style={s.emptyTitle}>Aucun membre</Text>
              <Text style={s.emptySub}>Ajoute les membres de ton équipe.</Text>
            </View>
          }
          renderItem={({ item: sty }) => (
            <View style={[s.card, !sty.is_active && { opacity: 0.5 }]}>
              <View style={s.cardRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{getInitials(sty.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={s.styName}>{sty.name}</Text>
                    {!sty.is_active && <View style={s.badge}><Text style={s.badgeText}>Inactif</Text></View>}
                  </View>
                  {sty.bio ? <Text style={s.styBio}>{sty.bio}</Text> : null}
                  {sty.specialties?.length > 0 && (
                    <View style={s.specRow}>
                      {sty.specialties.map(sp => (
                        <View key={sp} style={s.specPill}><Text style={s.specText}>{sp}</Text></View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={s.actions}>
                  <Pressable onPress={() => openEdit(sty)} hitSlop={8} style={s.actionBtn}>
                    <Ionicons name="pencil-outline" size={16} color={colors.electric} />
                  </Pressable>
                  <Pressable onPress={() => toggleActive(sty)} hitSlop={8} style={s.actionBtn}>
                    <Ionicons name={sty.is_active ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.textFaint} />
                  </Pressable>
                  <Pressable onPress={() => deleteStyleist(sty)} hitSlop={8} style={s.actionBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      </View>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={s.modal} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editing ? 'Modifier' : 'Nouveau membre'}</Text>
              <Pressable onPress={() => setModal(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <View style={s.formCard}>
              <View style={[s.field, s.fieldBorder]}>
                <Text style={s.flabel}>Nom *</Text>
                <TextInput style={s.finput} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Jordan Martin" placeholderTextColor={colors.textFaint} autoCapitalize="words" />
              </View>
              <View style={[s.field, s.fieldBorder]}>
                <Text style={s.flabel}>Bio</Text>
                <TextInput style={[s.finput, { minHeight: 60, textAlignVertical: 'top' }]} value={form.bio} onChangeText={v => setForm(f => ({ ...f, bio: v }))} placeholder="Spécialiste dégradés..." placeholderTextColor={colors.textFaint} multiline />
              </View>
              <View style={s.field}>
                <Text style={s.flabel}>Spécialités (séparées par virgule)</Text>
                <TextInput style={s.finput} value={form.specialties} onChangeText={v => setForm(f => ({ ...f, specialties: v }))} placeholder="Dégradé, Barbe, Afro" placeholderTextColor={colors.textFaint} />
              </View>
            </View>

            <Pressable onPress={save} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.6 }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>{editing ? 'Enregistrer' : 'Ajouter'}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered:  { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },

  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 13, marginBottom: spacing.md },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  card:    { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar:  { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.electricDim, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.electric, fontWeight: '800', fontSize: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  styName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  styBio:  { color: colors.textDim, fontSize: 12, marginTop: 2 },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  specPill:{ backgroundColor: colors.electricDim, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  specText:{ color: colors.electric, fontSize: 10, fontWeight: '600' },
  badge:   { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { color: colors.textFaint, fontSize: 10 },
  actions:   { flexDirection: 'column', gap: 8 },
  actionBtn: { padding: 4 },

  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyTitle: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
  emptySub:   { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  modal:        { flex: 1, backgroundColor: colors.bg },
  modalContent: { padding: spacing.md, gap: spacing.md, paddingBottom: 60 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  modalTitle:   { color: colors.text, fontSize: 18, fontWeight: '800' },
  formCard:     { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  field:        { padding: spacing.md },
  fieldBorder:  { borderBottomWidth: 1, borderBottomColor: colors.border },
  flabel:       { color: colors.textFaint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  finput:       { color: colors.text, fontSize: 15 },
  saveBtn:      { backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center' },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
