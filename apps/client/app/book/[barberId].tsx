import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Pressable, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@bookedup/shared';

const API    = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const { width: W } = Dimensions.get('window');

// ─── Calendar helpers ────────────────────────────────────────────────────────
const DAYS_FR   = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTHS_SHORT = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const DAYS_LONG    = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstWeekday(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; } // 0=Mon

function padDate(n: number) { return String(n).padStart(2, '0'); }
function toISO(y: number, m: number, d: number) { return `${y}-${padDate(m + 1)}-${padDate(d)}`; }

// ─── Types ───────────────────────────────────────────────────────────────────
type Service = { id: string; name: string; duration_minutes: number; price_cents: number };
type Stylist  = { id: string; name: string };
type Step     = 'datetime' | 'confirm';

// ─── Generate time slots 09:00–19:30 every 30 min ───────────────────────────
function generateSlots(startH = 9, endH = 19, stepMin = 30): string[] {
  const slots: string[] = [];
  for (let h = startH; h < endH; h++) {
    for (let m = 0; m < 60; m += stepMin) {
      slots.push(`${padDate(h)}:${padDate(m)}`);
    }
  }
  slots.push(`${padDate(endH)}:00`);
  return slots;
}

// ─── Calendar component ──────────────────────────────────────────────────────
function CalendarPicker({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const today    = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const totalDays = daysInMonth(year, month);
  const offset    = firstWeekday(year, month);
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const cellW = Math.floor((W - spacing.md * 2 - spacing.md * 2) / 7);

  return (
    <View style={cal.wrap}>
      {/* Month nav */}
      <View style={cal.header}>
        <Pressable onPress={prevMonth} hitSlop={12} style={cal.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.textDim} />
        </Pressable>
        <Text style={cal.monthLabel}>{MONTHS_FR[month]} {year}</Text>
        <Pressable onPress={nextMonth} hitSlop={12} style={cal.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </Pressable>
      </View>

      {/* Day names */}
      <View style={cal.dayNames}>
        {DAYS_FR.map(d => (
          <Text key={d} style={[cal.dayName, { width: cellW }]}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={cal.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={[cal.cell, { width: cellW }]} />;
          const dateStr = toISO(year, month, day);
          const isPast  = dateStr < todayStr;
          const isSel   = dateStr === selected;
          const isToday = dateStr === todayStr;
          const isFree  = !isPast;

          return (
            <Pressable
              key={day}
              style={[cal.cell, { width: cellW }]}
              onPress={() => isFree && onSelect(dateStr)}
              disabled={isPast}
            >
              <View style={[
                cal.dayCircle,
                isSel && cal.dayCircleSel,
                isToday && !isSel && cal.dayCircleToday,
              ]}>
                <Text style={[
                  cal.dayTxt,
                  isPast  && cal.dayTxtPast,
                  isFree && !isSel && cal.dayTxtFree,
                  isSel  && cal.dayTxtSel,
                ]}>
                  {day}
                </Text>
              </View>
              {isToday && !isSel && <View style={cal.todayDot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function BookScreen() {
  const { barberId, serviceId: preselected } = useLocalSearchParams<{ barberId: string; serviceId?: string }>();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();

  // Data
  const [shopName, setShopName]   = useState('');
  const [services, setServices]   = useState<Service[]>([]);
  const [stylists, setStylists]   = useState<Stylist[]>([]);

  // Selections
  const [step, setStep]           = useState<Step>('datetime');
  const [serviceId, setServiceId] = useState(preselected ?? '');
  const [stylistId, setStylistId] = useState<string | null>(null);
  const [date, setDate]           = useState('');
  const [time, setTime]           = useState('');

  // Confirmation extras
  const [promoCode, setPromoCode] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [notes, setNotes]         = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Customer info (from auth)
  const [custName, setCustName]   = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');

  // Availability
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const allSlots = generateSlots();

  // UI
  const [loading, setLoading]   = useState(true);
  const [booking, setBooking]   = useState(false);

  const selectedService = services.find(s => s.id === serviceId);
  const selectedStylist = stylists.find(s => s.id === stylistId);

  /* Init */
  const init = useCallback(async () => {
    const [{ data: b }, { data: svcs }, { data: stys }, { data: { user } }] = await Promise.all([
      supabase.from('barbers').select('shop_name').eq('id', barberId).single(),
      supabase.from('services').select('id, name, duration_minutes, price_cents').eq('barber_id', barberId).eq('is_active', true).order('sort_order'),
      supabase.from('stylists').select('id, name').eq('barber_id', barberId).eq('is_active', true).order('sort_order'),
      supabase.auth.getUser(),
    ]);
    setShopName((b as any)?.shop_name ?? '');
    setServices((svcs ?? []) as Service[]);
    setStylists((stys ?? []) as Stylist[]);
    if (user) {
      setCustName(user.user_metadata?.full_name ?? '');
      setCustEmail(user.email ?? '');
      setCustPhone(user.user_metadata?.phone ?? '');
    }
    if (!preselected && svcs?.[0]) setServiceId(svcs[0].id);
  }, [barberId, preselected]);

  useEffect(() => { init().finally(() => setLoading(false)); }, [init]);

  /* Load availability when date changes */
  useEffect(() => {
    if (!date || !selectedService) return;
    setSlotsLoading(true);
    setBusySlots([]);
    fetch(`${API}/api/availability?barber_id=${barberId}&date=${date}&duration=${selectedService.duration_minutes}`)
      .then(r => r.json())
      .then(d => setBusySlots(
        (d.slots ?? []).filter((s: { time: string; available: boolean }) => !s.available).map((s: { time: string }) => s.time)
      ))
      .catch(() => {})
      .finally(() => setSlotsLoading(false));
  }, [date, selectedService, barberId]);

  /* Book */
  async function confirmBooking() {
    if (!selectedService || !date || !time) return;
    setBooking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const [h, m] = time.split(':').map(Number);
      const endMin = h * 60 + m + selectedService.duration_minutes;
      const endsAt = `${date}T${padDate(Math.floor(endMin / 60))}:${padDate(endMin % 60)}:00`;

      const res = await fetch(`${API}/api/appointments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          barber_id:      barberId,
          service_id:     selectedService.id,
          stylist_id:     stylistId ?? null,
          starts_at:      `${date}T${time}:00`,
          ends_at:        endsAt,
          customer_name:  custName.trim() || 'Client',
          customer_email: custEmail.trim(),
          customer_phone: custPhone.trim() || undefined,
          notes:          notes.trim() || undefined,
        }),
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

  /* Formatted date label for confirmation */
  function formatDateLabel() {
    if (!date || !time || !selectedService) return '';
    const d = new Date(`${date}T${time}:00`);
    const endMin = d.getHours() * 60 + d.getMinutes() + selectedService.duration_minutes;
    const endH = Math.floor(endMin / 60);
    const endM = endMin % 60;
    const wd = DAYS_LONG[d.getDay() === 0 ? 6 : d.getDay() - 1];
    return `${wd} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${time} - ${padDate(endH)}:${padDate(endM)}`;
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <Stack.Screen options={{ title: shopName || 'Réserver', headerBackTitle: 'Retour' }} />
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  // ─── STEP: datetime ────────────────────────────────────────────────────────
  if (step === 'datetime') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack.Screen options={{ title: shopName, headerBackTitle: 'Retour' }} />
        <ScrollView contentContainerStyle={s.scrollPad} showsVerticalScrollIndicator={false}>

          {/* Votre rendez-vous */}
          <Text style={s.pageTitle}>Votre rendez-vous</Text>

          {/* Service card */}
          {selectedService && (
            <View style={s.serviceCard}>
              <View style={s.serviceCardTop}>
                <Text style={s.serviceCardName}>{selectedService.name}</Text>
                <Text style={s.serviceCardPrice}>{formatPrice(selectedService.price_cents)}</Text>
              </View>

              {/* Stylist selector */}
              <View style={s.stylistRow}>
                <View style={s.stylistIcon}>
                  <Ionicons name="people-outline" size={18} color={colors.textFaint} />
                </View>
                {stylists.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
                      <Pressable
                        onPress={() => setStylistId(null)}
                        style={[s.stylistPill, stylistId === null && s.stylistPillActive]}
                      >
                        <Text style={[s.stylistPillText, stylistId === null && s.stylistPillTextActive]}>
                          Peu importe
                        </Text>
                      </Pressable>
                      {stylists.map(st => (
                        <Pressable
                          key={st.id}
                          onPress={() => setStylistId(st.id)}
                          style={[s.stylistPill, stylistId === st.id && s.stylistPillActive]}
                        >
                          <Text style={[s.stylistPillText, stylistId === st.id && s.stylistPillTextActive]}>
                            {st.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <Text style={s.stylistNone}>Premier disponible</Text>
                )}
              </View>

              <View style={s.serviceCardMeta}>
                <Ionicons name="time-outline" size={13} color={colors.textFaint} />
                <Text style={s.serviceCardDur}>{selectedService.duration_minutes} minutes</Text>
              </View>

              {/* Change service if multiple */}
              {services.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
                    {services.map(svc => (
                      <Pressable
                        key={svc.id}
                        onPress={() => { setServiceId(svc.id); setTime(''); }}
                        style={[s.svcPill, serviceId === svc.id && s.svcPillActive]}
                      >
                        <Text style={[s.svcPillText, serviceId === svc.id && s.svcPillTextActive]}>
                          {svc.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          )}

          {/* Calendar */}
          <Text style={s.sectionLabel}>Sélectionnez une date et une heure</Text>
          <View style={s.calendarWrap}>
            <CalendarPicker selected={date} onSelect={d => { setDate(d); setTime(''); }} />
          </View>

          {/* Time slots */}
          {date && (
            slotsLoading ? (
              <View style={s.slotsLoader}>
                <ActivityIndicator color={colors.electric} />
              </View>
            ) : (
              <View style={s.slotsGrid}>
                {allSlots.map(slot => {
                  const busy = busySlots.includes(slot);
                  const sel  = slot === time;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => !busy && setTime(slot)}
                      disabled={busy}
                      style={[s.slotPill, sel && s.slotPillSel, busy && s.slotPillBusy]}
                    >
                      <Text style={[s.slotTxt, sel && s.slotTxtSel, busy && s.slotTxtBusy]}>{slot}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )
          )}

          {!date && (
            <Text style={s.selectDateHint}>← Sélectionnez un jour dans le calendrier</Text>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Sticky next */}
        <View style={[s.stickyBar, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            onPress={() => setStep('confirm')}
            disabled={!date || !time}
            style={[s.stickyBtn, (!date || !time) && s.stickyBtnDisabled]}
          >
            <Text style={s.stickyBtnText}>Suivant</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── STEP: confirm ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: shopName, headerBackTitle: 'Retour' }} />
      <ScrollView contentContainerStyle={s.scrollPad} showsVerticalScrollIndicator={false}>

        {/* Recap header */}
        <Text style={s.pageTitle}>Service(s) sélectionné(s)</Text>
        <View style={s.confirmDateRow}>
          <Ionicons name="calendar-outline" size={15} color={colors.textFaint} />
          <Text style={s.confirmDateTxt}>{formatDateLabel()}</Text>
        </View>

        {/* Receipt card */}
        <View style={s.receiptCard}>
          {/* Promo code */}
          <View style={s.promoRow}>
            <TextInput
              style={s.promoInput}
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Code promo"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
            />
            <Pressable
              onPress={() => promoCode && Alert.alert('Code promo', 'Fonctionnalité bientôt disponible.')}
              style={s.promoApply}
            >
              <Text style={s.promoApplyText}>Appliquer</Text>
            </Pressable>
          </View>

          <View style={s.receiptDivider} />

          {/* Service line */}
          {selectedService && (
            <View style={s.receiptLine}>
              <View style={{ flex: 1 }}>
                <Text style={s.receiptLineName}>{selectedService.name}</Text>
                <Text style={s.receiptLineSub}>
                  {selectedStylist ? `${selectedStylist.name} · ` : ''}{selectedService.duration_minutes} minutes
                </Text>
              </View>
              <Text style={s.receiptLinePrice}>{formatPrice(selectedService.price_cents)}</Text>
            </View>
          )}

          <View style={s.receiptDivider} />

          {/* Total */}
          <View style={s.receiptTotal}>
            <Text style={s.receiptTotalLabel}>Total :</Text>
            <Text style={s.receiptTotalValue}>{selectedService ? formatPrice(selectedService.price_cents) : '—'}</Text>
          </View>
        </View>

        {/* Note */}
        {!showNotes ? (
          <Pressable onPress={() => setShowNotes(true)} style={s.addNoteRow}>
            <Text style={s.addNoteTxt}>Ajouter une note</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.electric} />
          </Pressable>
        ) : (
          <TextInput
            style={s.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: première visite, allergie…"
            placeholderTextColor={colors.textFaint}
            multiline
            numberOfLines={3}
          />
        )}

        {/* Payment method */}
        <Text style={s.sectionLabel}>Méthode de paiement</Text>
        <View style={s.paymentCard}>
          <View style={s.paymentOption}>
            <View style={s.radioActive}>
              <View style={s.radioDot} />
            </View>
            <Text style={s.paymentOptionText}>Paiement dans le salon</Text>
          </View>
        </View>

        {/* Newsletter */}
        <Text style={s.sectionLabel}>Newsletter</Text>
        <View style={s.newsletterCard}>
          <Text style={s.newsletterText}>Je souhaite recevoir les newsletters de {shopName}</Text>
          <Switch
            value={newsletter}
            onValueChange={setNewsletter}
            trackColor={{ false: colors.border, true: colors.electric }}
            thumbColor="#fff"
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky confirm */}
      <View style={[s.stickyBarConfirm, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={s.stickyPrice}>{selectedService ? formatPrice(selectedService.price_cents) : ''}</Text>
        <Pressable
          onPress={confirmBooking}
          disabled={booking}
          style={[s.confirmBtn, booking && s.confirmBtnDisabled]}
        >
          {booking
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.confirmBtnText}>Confirmer la réservation</Text>
          }
        </Pressable>
      </View>
    </View>
  );
}

// ─── Calendar styles ──────────────────────────────────────────────────────────
const cal = StyleSheet.create({
  wrap:       { paddingVertical: spacing.sm },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn:     { padding: 6 },
  monthLabel: { color: colors.text, fontWeight: '700', fontSize: 16 },
  dayNames:   { flexDirection: 'row', marginBottom: 8 },
  dayName:    { textAlign: 'center', color: colors.textFaint, fontSize: 12, fontWeight: '600' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap' },
  cell:       { alignItems: 'center', marginBottom: 6 },
  dayCircle:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayCircleSel:   { backgroundColor: colors.electric },
  dayCircleToday: { borderWidth: 2, borderColor: colors.electric },
  dayTxt:     { fontSize: 14, color: colors.textFaint },
  dayTxtPast: { opacity: 0.3 },
  dayTxtFree: { color: colors.text, fontWeight: '500' },
  dayTxtSel:  { color: '#fff', fontWeight: '700' },
  todayDot:   { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.electric, marginTop: 1 },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  centered:   { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  scrollPad:  { padding: spacing.md },
  pageTitle:  { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: spacing.sm },
  sectionLabel: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },

  // Service card
  serviceCard:    { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  serviceCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  serviceCardName: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  serviceCardPrice: { color: colors.text, fontWeight: '700', fontSize: 17 },
  stylistRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  stylistIcon:    { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.electricDim, alignItems: 'center', justifyContent: 'center' },
  stylistNone:    { color: colors.textFaint, fontSize: 13 },
  stylistPill:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  stylistPillActive: { borderColor: colors.electric, backgroundColor: 'rgba(124,58,237,0.1)' },
  stylistPillText: { color: colors.textDim, fontSize: 13 },
  stylistPillTextActive: { color: colors.electric, fontWeight: '600' },
  serviceCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  serviceCardDur:  { color: colors.textFaint, fontSize: 13 },
  svcPill:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  svcPillActive:   { borderColor: colors.electric, backgroundColor: 'rgba(124,58,237,0.1)' },
  svcPillText:     { color: colors.textDim, fontSize: 12 },
  svcPillTextActive: { color: colors.electric, fontWeight: '600' },

  // Calendar
  calendarWrap: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },

  // Time slots
  slotsLoader:    { alignItems: 'center', paddingVertical: 24 },
  slotsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  slotPill:       { width: (W - spacing.md * 2 - 8 * 3) / 4, paddingVertical: 11, alignItems: 'center', borderRadius: radius.md, backgroundColor: 'rgba(124,58,237,0.1)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)' },
  slotPillSel:    { backgroundColor: colors.electric, borderColor: colors.electric },
  slotPillBusy:   { backgroundColor: colors.border, borderColor: 'transparent', opacity: 0.4 },
  slotTxt:        { color: colors.electric, fontWeight: '600', fontSize: 14 },
  slotTxtSel:     { color: '#fff' },
  slotTxtBusy:    { color: colors.textFaint },
  selectDateHint: { color: colors.textFaint, textAlign: 'center', marginTop: spacing.md, fontStyle: 'italic' },

  // Sticky bar (datetime step)
  stickyBar:     { backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md },
  stickyBtn:     { backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  stickyBtnDisabled: { opacity: 0.35 },
  stickyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Confirmation step
  confirmDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  confirmDateTxt: { color: colors.textDim, fontSize: 14 },

  receiptCard:    { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  promoRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  promoInput:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.text, fontSize: 14 },
  promoApply:     {},
  promoApplyText: { color: colors.electric, fontWeight: '700', fontSize: 14 },
  receiptDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  receiptLine:    { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  receiptLineName:  { color: colors.text, fontWeight: '600', fontSize: 14 },
  receiptLineSub:   { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  receiptLinePrice: { color: colors.text, fontWeight: '700', fontSize: 16 },
  receiptTotal:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTotalLabel: { color: colors.text, fontWeight: '700', fontSize: 15 },
  receiptTotalValue: { color: colors.text, fontWeight: '800', fontSize: 18 },

  addNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.sm },
  addNoteTxt: { color: colors.electric, fontWeight: '600', fontSize: 14 },
  notesInput: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.text, fontSize: 14, textAlignVertical: 'top', minHeight: 80, marginBottom: spacing.sm },

  paymentCard:   { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  radioActive:   { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.electric, alignItems: 'center', justifyContent: 'center' },
  radioDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.electric },
  paymentOptionText: { color: colors.text, fontSize: 15, fontWeight: '500' },

  newsletterCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  newsletterText: { color: colors.textDim, fontSize: 14, flex: 1, lineHeight: 20 },

  // Sticky confirm bar
  stickyBarConfirm: { backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stickyPrice:      { color: colors.text, fontSize: 18, fontWeight: '800', minWidth: 60 },
  confirmBtn:       { flex: 1, backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});
