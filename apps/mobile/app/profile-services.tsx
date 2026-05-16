import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';
import { formatPrice } from '@bookedup/shared';
import { supabase } from '@/lib/supabase';

type Service = { id: string; name: string; description: string | null; duration_minutes: number; price_cents: number; is_active: boolean; sort_order: number };
type Form = { name: string; description: string; duration: string; price: string };

const EMPTY_FORM: Form = { name: '', description: '', duration: '30', price: '' };

export default function ProfileServicesScreen() {
  const [services,   setServices]   = useState<Service[]>([]);
  const [barberId,   setBarberId]   = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState<Service | null>(null);
  const [form,       setForm]       = useState<Form>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: barber } = await supabase.from('barbers').select('id').eq('owner_id', user.id).single();
    if (!barber) return;
    setBarberId(barber.id);
    const { data } = await supabase.from('services').select('*').eq('barber_id', barber.id).order('sort_order');
    setServices((data ?? []) as Service[]);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setModal(true); }
  function openEdit(svc: Service) {
    setEditing(svc);
    setForm({ name: svc.name, description: svc.description ?? '', duration: String(svc.duration_minutes), price: String(svc.price_cents / 100) });
    setModal(true);
  }

  async function save() {
    if (!form.name.trim()) { Alert.alert('Erreur', 'Le nom est obligatoire.'); return; }
    const dur   = parseInt(form.duration) || 30;
    const price = Math.round(parseFloat(form.price.replace(',', '.')) * 100) || 0;
    if (!barberId) return;
    setSaving(true);
    if (editing) {
      await supabase.from('services').update({ name: form.name.trim(), description: form.description.trim() || null, duration_minutes: dur, price_cents: price }).eq('id', editing.id);
    } else {
      const maxOrder = services.reduce((m, s) => Math.max(m, s.sort_order), -1);
      await supabase.from('services').insert({ barber_id: barberId, name: form.name.trim(), description: form.description.trim() || null, duration_minutes: dur, price_cents: price, is_active: true, sort_order: maxOrder + 1 });
    }
    setSaving(false);
    setModal(false);
    await load();
  }

  async function toggleActive(svc: Service) {
    await supabase.from('services').update({ is_active: !svc.is_active }).eq('id', svc.id);
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, is_active: !s.is_active } : s));
  }

  async function deleteService(svc: Service) {
    Alert.alert('Supprimer', `Supprimer "${svc.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await supabase.from('services').delete().eq('id', svc.id);
        setServices(prev => prev.filter(s => s.id !== svc.id));
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
          data={services}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />}
          ListHeaderComponent={
            <Pressable onPress={openAdd} style={s.addBtn}>
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={s.addBtnText}>Ajouter une prestation</Text>
            </Pressable>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cut-outline" size={44} color={colors.textFaint} />
              <Text style={s.emptyTitle}>Aucune prestation</Text>
              <Text style={s.emptySub}>Ajoute tes services pour que les clients puissent réserver.</Text>
            </View>
          }
          renderItem={({ item: svc }) => (
            <View style={[s.card, !svc.is_active && s.cardInactive]}>
              <View style={s.cardRow}>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={[s.svcName, !svc.is_active && { color: colors.textDim }]}>{svc.name}</Text>
                    {!svc.is_active && (
                      <View style={s.inactiveBadge}><Text style={s.inactiveBadgeText}>Inactif</Text></View>
                    )}
                  </View>
                  {svc.description ? <Text style={s.svcDesc}>{svc.description}</Text> : null}
                  <View style={s.metaRow}>
                    <View style={s.pill}>
                      <Ionicons name="time-outline" size={11} color={colors.textFaint} />
                      <Text style={s.pillText}>{svc.duration_minutes} min</Text>
                    </View>
                    <Text style={s.price}>{formatPrice(svc.price_cents)}</Text>
                  </View>
                </View>
                <View style={s.actions}>
                  <Pressable onPress={() => openEdit(svc)} hitSlop={8} style={s.actionBtn}>
                    <Ionicons name="pencil-outline" size={16} color={colors.electric} />
                  </Pressable>
                  <Pressable onPress={() => toggleActive(svc)} hitSlop={8} style={s.actionBtn}>
                    <Ionicons name={svc.is_active ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.textFaint} />
                  </Pressable>
                  <Pressable onPress={() => deleteService(svc)} hitSlop={8} style={s.actionBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      </View>

      {/* ── Add / Edit modal ── */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={s.modal} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editing ? 'Modifier' : 'Nouvelle prestation'}</Text>
              <Pressable onPress={() => setModal(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <View style={s.formCard}>
              <View style={[s.field, s.fieldBorder]}>
                <Text style={s.flabel}>Nom *</Text>
                <TextInput style={s.finput} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Coupe + barbe" placeholderTextColor={colors.textFaint} />
              </View>
              <View style={[s.field, s.fieldBorder]}>
                <Text style={s.flabel}>Description</Text>
                <TextInput style={[s.finput, { minHeight: 60, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} placeholder="Optionnel" placeholderTextColor={colors.textFaint} multiline />
              </View>
              <View style={s.twoCol}>
                <View style={[s.field, { flex: 1, borderRightWidth: 1, borderRightColor: colors.border }]}>
                  <Text style={s.flabel}>Durée (min)</Text>
                  <TextInput style={s.finput} value={form.duration} onChangeText={v => setForm(f => ({ ...f, duration: v }))} keyboardType="number-pad" placeholder="30" placeholderTextColor={colors.textFaint} />
                </View>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={s.flabel}>Prix (€)</Text>
                  <TextInput style={s.finput} value={form.price} onChangeText={v => setForm(f => ({ ...f, price: v }))} keyboardType="decimal-pad" placeholder="25" placeholderTextColor={colors.textFaint} />
                </View>
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

  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },

  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 13, marginBottom: spacing.md },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  card:         { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cardInactive: { opacity: 0.55 },
  cardRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  svcName:      { color: colors.text, fontWeight: '700', fontSize: 15 },
  svcDesc:      { color: colors.textDim, fontSize: 12, marginTop: 2 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  pill:         { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  pillText:     { color: colors.textFaint, fontSize: 11 },
  price:        { color: colors.electric, fontWeight: '700', fontSize: 14 },
  inactiveBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  inactiveBadgeText: { color: colors.textFaint, fontSize: 10 },

  actions:   { flexDirection: 'column', gap: 8 },
  actionBtn: { padding: 4 },

  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyTitle: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
  emptySub:   { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  // Modal
  modal:        { flex: 1, backgroundColor: colors.bg },
  modalContent: { padding: spacing.md, gap: spacing.md, paddingBottom: 60 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  modalTitle:   { color: colors.text, fontSize: 18, fontWeight: '800' },

  formCard:    { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  field:       { padding: spacing.md },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  twoCol:      { flexDirection: 'row' },
  flabel:      { color: colors.textFaint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  finput:      { color: colors.text, fontSize: 15 },

  saveBtn:     { backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
