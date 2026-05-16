import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@bookedup/shared';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type Service    = { id: string; name: string; duration_minutes: number; price_cents: number };
type Stylist    = { id: string; name: string };
type SlotGroup  = { date: string; label: string; slots: string[] };

type Step = 'service' | 'date' | 'time' | 'stylist' | 'info' | 'confirm';

const STEPS: Step[] = ['service', 'date', 'time', 'stylist', 'info', 'confirm'];

function buildDateSlots(): SlotGroup[] {
  const groups: SlotGroup[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const label = i === 0
      ? "Aujourd'hui"
      : i === 1
      ? 'Demain'
      : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
    groups.push({ date: dateStr, label, slots: [] });
  }
  return groups;
}

function generateHourSlots(openH = 9, closeH = 19, stepMin = 30): string[] {
  const slots: string[] = [];
  for (let h = openH; h < closeH; h++) {
    for (let m = 0; m < 60; m += stepMin) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

export default function BookScreen() {
  const { barberId, serviceId: preselectedServiceId } = useLocalSearchParams<{ barberId: string; serviceId?: string }>();
  const router = useRouter();

  // Data
  const [services, setServices]   = useState<Service[]>([]);
  const [stylists, setStylists]   = useState<Stylist[]>([]);
  const [availSlots, setAvailSlots] = useState<string[]>([]);
  const [busySlots, setBusySlots]   = useState<string[]>([]);

  // Selections
  const [step, setStep]           = useState<Step>('service');
  const [serviceId, setServiceId] = useState(preselectedServiceId ?? '');
  const [date, setDate]           = useState('');
  const [time, setTime]           = useState('');
  const [stylistId, setStylistId] = useState<string | null>(null); // null = no pref
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [notes, setNotes]         = useState('');

  // UI
  const [loading, setLoading]     = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking]     = useState(false);

  const selectedService = services.find(s => s.id === serviceId);
  const selectedStylist = stylists.find(s => s.id === stylistId);

  /* ── Load services & user info ── */
  const init = useCallback(async () => {
    const [{ data: svcs }, { data: stys }, { data: { user } }] = await Promise.all([
      supabase.from('services').select('id, name, duration_minutes, price_cents').eq('barber_id', barberId).eq('is_active', true).order('sort_order'),
      supabase.from('stylists').select('id, name').eq('barber_id', barberId).eq('is_active', true).order('sort_order'),
      supabase.auth.getUser(),
    ]);
    setServices((svcs ?? []) as Service[]);
    setStylists((stys ?? []) as Stylist[]);
    if (user) {
      setName(user.user_metadata?.full_name ?? '');
      setEmail(user.email ?? '');
      setPhone(user.user_metadata?.phone ?? '');
    }
    // If service was pre-selected, skip to date
    if (preselectedServiceId && svcs?.some(s => s.id === preselectedServiceId)) {
      setStep('date');
    }
  }, [barberId, preselectedServiceId]);

  useEffect(() => { init().finally(() => setLoading(false)); }, [init]);

  /* ── Load availability when date changes ── */
  useEffect(() => {
    if (!date || !selectedService) return;
    setSlotsLoading(true);
    const url = `${API}/api/availability?barber_id=${barberId}&date=${date}&duration=${selectedService.duration_minutes}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setBusySlots(d.booked ?? []);
        setAvailSlots(generateHourSlots());
      })
      .catch(() => setAvailSlots(generateHourSlots()))
      .finally(() => setSlotsLoading(false));
  }, [date, selectedService, barberId]);

  /* ── Book ── */
  async function confirmBooking() {
    if (!selectedService || !date || !time || !name || !email) return;
    setBooking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const [h, m] = time.split(':').map(Number);
      const totalEnd = h * 60 + m + selectedService.duration_minutes;
      const endH = String(Math.floor(totalEnd / 60)).padStart(2, '0');
      const endM = String(totalEnd % 60).padStart(2, '0');

      const body = {
        barber_id:      barberId,
        service_id:     selectedService.id,
        stylist_id:     stylistId ?? null,
        starts_at:      `${date}T${time}:00`,
        ends_at:        `${date}T${endH}:${endM}:00`,
        customer_name:  name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || undefined,
        notes:          notes.trim() || undefined,
      };

      const res = await fetch(`${API}/api/appointments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        Alert.alert('Erreur', json.error || `Erreur ${res.status}`);
        return;
      }

      router.replace(`/booking/success?id=${json.appointment_id}` as any);
    } catch (e: any) {
      Alert.alert('Erreur réseau', e.message);
    } finally {
      setBooking(false);
    }
  }

  /* ── Navigation ── */
  function nextStep() {
    const idx = STEPS.indexOf(step);
    // Skip stylist step if no stylists
    if (STEPS[idx + 1] === 'stylist' && stylists.length === 0) {
      setStep('info');
    } else {
      setStep(STEPS[idx + 1] ?? step);
    }
  }
  function prevStep() {
    const idx = STEPS.indexOf(step);
    if (idx === 0) { router.back(); return; }
    if (step === 'info' && stylists.length === 0) {
      setStep('time');
    } else {
      setStep(STEPS[idx - 1] ?? step);
    }
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  const dateGroups = buildDateSlots();

  return (
    <>
      <Stack.Screen options={{ title: 'Réserver' }} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Progress bar */}
        <View style={s.progress}>
          {STEPS.filter(st => !(st === 'stylist' && stylists.length === 0)).map((st, i, arr) => (
            <View
              key={st}
              style={[
                s.progressDot,
                STEPS.indexOf(step) >= STEPS.indexOf(st) && s.progressDotActive,
              ]}
            />
          ))}
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* ── STEP: service ── */}
          {step === 'service' && (
            <>
              <Text style={s.stepTitle}>Quelle prestation ?</Text>
              {services.map(svc => (
                <Pressable
                  key={svc.id}
                  onPress={() => { setServiceId(svc.id); }}
                  style={[s.optionCard, serviceId === svc.id && s.optionCardActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.optionName}>{svc.name}</Text>
                    <Text style={s.optionSub}>{svc.duration_minutes} min</Text>
                  </View>
                  <Text style={s.optionPrice}>{formatPrice(svc.price_cents)}</Text>
                  {serviceId === svc.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.electric} />
                  )}
                </Pressable>
              ))}
            </>
          )}

          {/* ── STEP: date ── */}
          {step === 'date' && (
            <>
              <Text style={s.stepTitle}>Quel jour ?</Text>
              {dateGroups.map(g => (
                <Pressable
                  key={g.date}
                  onPress={() => { setDate(g.date); setTime(''); }}
                  style={[s.optionCard, date === g.date && s.optionCardActive]}
                >
                  <Text style={[s.optionName, date === g.date && { color: colors.electric }]}>
                    {g.label}
                  </Text>
                  {date === g.date && <Ionicons name="checkmark-circle" size={20} color={colors.electric} />}
                </Pressable>
              ))}
            </>
          )}

          {/* ── STEP: time ── */}
          {step === 'time' && (
            <>
              <Text style={s.stepTitle}>À quelle heure ?</Text>
              {slotsLoading ? (
                <ActivityIndicator color={colors.electric} style={{ marginTop: 40 }} />
              ) : (
                <View style={s.slotsGrid}>
                  {availSlots.map(slot => {
                    const busy = busySlots.includes(slot);
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => !busy && setTime(slot)}
                        disabled={busy}
                        style={[
                          s.slotBtn,
                          time === slot && s.slotBtnActive,
                          busy && s.slotBtnBusy,
                        ]}
                      >
                        <Text style={[
                          s.slotText,
                          time === slot && s.slotTextActive,
                          busy && s.slotTextBusy,
                        ]}>
                          {slot}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ── STEP: stylist ── */}
          {step === 'stylist' && stylists.length > 0 && (
            <>
              <Text style={s.stepTitle}>Un coiffeur en particulier ?</Text>
              <Pressable
                onPress={() => setStylistId(null)}
                style={[s.optionCard, stylistId === null && s.optionCardActive]}
              >
                <Text style={s.optionName}>Peu importe</Text>
                <Text style={s.optionSub}>Premier disponible</Text>
                {stylistId === null && <Ionicons name="checkmark-circle" size={20} color={colors.electric} />}
              </Pressable>
              {stylists.map(st => (
                <Pressable
                  key={st.id}
                  onPress={() => setStylistId(st.id)}
                  style={[s.optionCard, stylistId === st.id && s.optionCardActive]}
                >
                  <View style={s.stylistAvatar}>
                    <Text style={s.stylistAvatarText}>{st.name.charAt(0)}</Text>
                  </View>
                  <Text style={[s.optionName, { flex: 1 }]}>{st.name}</Text>
                  {stylistId === st.id && <Ionicons name="checkmark-circle" size={20} color={colors.electric} />}
                </Pressable>
              ))}
            </>
          )}

          {/* ── STEP: info ── */}
          {step === 'info' && (
            <>
              <Text style={s.stepTitle}>Tes coordonnées</Text>
              <View style={s.field}>
                <Text style={s.label}>Prénom *</Text>
                <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Karim" placeholderTextColor={colors.textFaint} autoCapitalize="words" />
              </View>
              <View style={s.field}>
                <Text style={s.label}>Email *</Text>
                <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="toi@email.com" placeholderTextColor={colors.textFaint} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={s.field}>
                <Text style={s.label}>Téléphone</Text>
                <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+33 6 …" placeholderTextColor={colors.textFaint} keyboardType="phone-pad" />
              </View>
              <View style={s.field}>
                <Text style={s.label}>Notes (optionnel)</Text>
                <TextInput
                  style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ex: première visite, allergie…"
                  placeholderTextColor={colors.textFaint}
                  multiline
                />
              </View>
            </>
          )}

          {/* ── STEP: confirm ── */}
          {step === 'confirm' && selectedService && (
            <>
              <Text style={s.stepTitle}>Récapitulatif</Text>
              <View style={s.summaryCard}>
                <Row icon="cut-outline"      label="Prestation" value={selectedService.name} />
                <Row icon="calendar-outline" label="Date"       value={new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />
                <Row icon="time-outline"     label="Heure"      value={time} />
                {selectedStylist && <Row icon="person-outline" label="Coiffeur" value={selectedStylist.name} />}
                <Row icon="person-outline"   label="Nom"        value={name} />
                <Row icon="mail-outline"     label="Email"      value={email} />
                {phone ? <Row icon="call-outline" label="Tél" value={phone} /> : null}
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text style={s.totalValue}>{formatPrice(selectedService.price_cents)}</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer nav */}
        <View style={s.footer}>
          <Pressable onPress={prevStep} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.textDim} />
            <Text style={s.backBtnText}>Retour</Text>
          </Pressable>

          {step !== 'confirm' ? (
            <Pressable
              onPress={nextStep}
              disabled={
                (step === 'service' && !serviceId) ||
                (step === 'date'    && !date) ||
                (step === 'time'    && !time) ||
                (step === 'info'    && (!name || !email))
              }
              style={[s.nextBtn, ((step === 'service' && !serviceId) || (step === 'date' && !date) || (step === 'time' && !time) || (step === 'info' && (!name || !email))) && s.nextBtnDisabled]}
            >
              <Text style={s.nextBtnText}>Suivant</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Pressable>
          ) : (
            <Pressable onPress={confirmBooking} disabled={booking} style={[s.nextBtn, booking && s.nextBtnDisabled]}>
              {booking
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.nextBtnText}>Confirmer</Text>
              }
            </Pressable>
          )}
        </View>
      </View>
    </>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={15} color={colors.textFaint} />
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  scroll:   { flex: 1, backgroundColor: colors.bg },
  content:  { padding: spacing.md, paddingBottom: 20, gap: spacing.sm },

  progress:        { flexDirection: 'row', gap: 6, padding: spacing.md, paddingBottom: 4 },
  progressDot:     { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.electric },

  stepTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.sm },

  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  optionCardActive: { borderColor: colors.electric, backgroundColor: 'rgba(124,58,237,0.08)' },
  optionName:  { color: colors.text, fontWeight: '600', fontSize: 15 },
  optionSub:   { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  optionPrice: { color: colors.electric, fontWeight: '700', fontSize: 15 },

  slotsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotBtn:       { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  slotBtnActive: { borderColor: colors.electric, backgroundColor: 'rgba(124,58,237,0.12)' },
  slotBtnBusy:   { opacity: 0.3 },
  slotText:      { color: colors.textDim, fontWeight: '500', fontSize: 14 },
  slotTextActive: { color: colors.electric },
  slotTextBusy:  { color: colors.textFaint },

  stylistAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.electricDim, alignItems: 'center', justifyContent: 'center' },
  stylistAvatarText: { color: colors.electric, fontWeight: '700' },

  field: { marginBottom: spacing.sm },
  label: { color: colors.textFaint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.text, fontSize: 15 },

  summaryCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  row:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel:    { color: colors.textFaint, fontSize: 13, width: 80 },
  rowValue:    { color: colors.text, fontSize: 13, flex: 1, fontWeight: '500' },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel:  { color: colors.textDim, fontWeight: '600' },
  totalValue:  { color: colors.electric, fontWeight: '700', fontSize: 18 },

  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 4 },
  backBtnText: { color: colors.textDim, fontWeight: '500' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 13, paddingHorizontal: 24 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
