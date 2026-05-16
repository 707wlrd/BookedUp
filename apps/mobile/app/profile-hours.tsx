import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type DaySchedule = { open: boolean; from: string; to: string };
type Schedule = Record<string, DaySchedule>;

const DAYS = [
  { key: 'lundi',     label: 'Lundi' },
  { key: 'mardi',     label: 'Mardi' },
  { key: 'mercredi',  label: 'Mercredi' },
  { key: 'jeudi',     label: 'Jeudi' },
  { key: 'vendredi',  label: 'Vendredi' },
  { key: 'samedi',    label: 'Samedi' },
  { key: 'dimanche',  label: 'Dimanche' },
];

const DEFAULT_SCHEDULE: Schedule = Object.fromEntries(
  DAYS.map(({ key }, i) => [key, { open: i < 5, from: '09:00', to: '18:00' }])
);

function validateTime(t: string) {
  return /^\d{2}:\d{2}$/.test(t);
}

export default function ProfileHoursScreen() {
  const router = useRouter();
  const [schedule,  setSchedule]  = useState<Schedule>(DEFAULT_SCHEDULE);
  const [barberId,  setBarberId]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: barber } = await supabase
        .from('barbers').select('id, opening_hours').eq('owner_id', user.id).single();
      if (barber) {
        setBarberId(barber.id);
        if (barber.opening_hours) {
          setSchedule({ ...DEFAULT_SCHEDULE, ...(barber.opening_hours as Schedule) });
        }
      }
      setLoading(false);
    })();
  }, []);

  function toggle(day: string, open: boolean) {
    setSchedule(s => ({ ...s, [day]: { ...s[day], open } }));
  }
  function setFrom(day: string, v: string) {
    setSchedule(s => ({ ...s, [day]: { ...s[day], from: v } }));
  }
  function setTo(day: string, v: string) {
    setSchedule(s => ({ ...s, [day]: { ...s[day], to: v } }));
  }

  async function save() {
    // Validate times
    for (const { key } of DAYS) {
      const d = schedule[key];
      if (d.open && (!validateTime(d.from) || !validateTime(d.to))) {
        Alert.alert('Format invalide', `Heure invalide pour ${key}. Format : HH:MM`);
        return;
      }
    }
    if (!barberId) return;
    setSaving(true);
    const { error } = await supabase
      .from('barbers').update({ opening_hours: schedule }).eq('id', barberId);
    setSaving(false);
    if (error) Alert.alert('Erreur', error.message);
    else { Alert.alert('Sauvegardé ✓', ''); router.back(); }
  }

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.electric} size="large" /></View>;
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        {DAYS.map(({ key, label }, idx) => {
          const d = schedule[key];
          return (
            <View key={key} style={[s.dayRow, idx < DAYS.length - 1 && s.dayBorder]}>
              {/* Toggle + day name */}
              <Switch
                value={d.open}
                onValueChange={v => toggle(key, v)}
                trackColor={{ false: colors.border, true: 'rgba(124,58,237,0.4)' }}
                thumbColor={d.open ? colors.electric : colors.textFaint}
              />
              <Text style={[s.dayLabel, !d.open && { color: colors.textFaint }]}>{label}</Text>

              {/* Hours */}
              {d.open ? (
                <View style={s.hoursRow}>
                  <TextInput
                    style={s.timeInput}
                    value={d.from}
                    onChangeText={v => setFrom(key, v)}
                    placeholder="09:00"
                    placeholderTextColor={colors.textFaint}
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                  />
                  <Text style={s.timeSep}>–</Text>
                  <TextInput
                    style={s.timeInput}
                    value={d.to}
                    onChangeText={v => setTo(key, v)}
                    placeholder="18:00"
                    placeholderTextColor={colors.textFaint}
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              ) : (
                <Text style={s.closedText}>Fermé</Text>
              )}
            </View>
          );
        })}
      </View>

      <Pressable onPress={save} disabled={saving} style={[s.btn, saving && { opacity: 0.6 }]}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>Enregistrer</Text>}
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.bg },
  content:  { padding: spacing.md, gap: spacing.md, paddingBottom: 60 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  card:      { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  dayRow:    { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: 12 },
  dayBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dayLabel:  { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },

  hoursRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: 14, fontWeight: '600',
    paddingHorizontal: 10, paddingVertical: 6,
    width: 60, textAlign: 'center',
  },
  timeSep:   { color: colors.textFaint, fontSize: 14 },
  closedText:{ color: colors.textFaint, fontSize: 13, fontStyle: 'italic' },

  btn:     { backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
