import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/lib/theme';
import { formatPrice } from '@bookedup/shared';
import { supabase } from '@/lib/supabase';

type Appt = {
  id: string;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  status: string;
  price_cents: number;
  services: { name: string; duration_minutes: number } | null;
  stylists: { name: string } | null;
};

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmé',   color: colors.electric,  bg: 'rgba(124,58,237,0.12)' },
  pending:   { label: 'En attente', color: colors.warning,   bg: 'rgba(245,158,11,0.12)' },
  completed: { label: 'Terminé',    color: colors.success,   bg: 'rgba(34,197,94,0.12)'  },
  cancelled: { label: 'Annulé',     color: colors.danger,    bg: 'rgba(239,68,68,0.12)'  },
  no_show:   { label: 'No-show',    color: colors.textFaint, bg: 'rgba(255,255,255,0.06)'},
};

const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS_FR  = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function getWeekDays(base: Date): Date[] {
  const dow = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate()  === b.getDate();
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();

  const todayBase = new Date();
  todayBase.setHours(0, 0, 0, 0);

  const [weekBase,   setWeekBase]   = useState(todayBase);
  const [selected,   setSelected]   = useState(todayBase);
  const [appts,      setAppts]      = useState<Appt[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [barberId,   setBarberId]   = useState<string | null>(null);

  const weekDays = getWeekDays(weekBase);

  const loadBarber = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: barber } = await supabase
      .from('barbers').select('id').eq('owner_id', user.id).single();
    if (barber) setBarberId(barber.id);
    return barber?.id ?? null;
  }, []);

  const loadAppts = useCallback(async (day: Date, bid?: string | null) => {
    const id = bid ?? barberId;
    if (!id) return;
    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end   = new Date(day); end.setHours(23, 59, 59, 999);
    const { data } = await supabase
      .from('appointments')
      .select('id, starts_at, ends_at, customer_name, status, price_cents, services(name, duration_minutes), stylists(name)')
      .eq('barber_id', id)
      .gte('starts_at', start.toISOString())
      .lte('starts_at', end.toISOString())
      .order('starts_at');
    setAppts((data ?? []) as Appt[]);
  }, [barberId]);

  useEffect(() => {
    loadBarber().then(id => loadAppts(selected, id)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (barberId) loadAppts(selected);
  }, [selected, barberId]);

  // ── Realtime : rafraîchit l'agenda dès qu'un RDV est créé/modifié/annulé ──
  useEffect(() => {
    if (!barberId) return;
    const channel = supabase
      .channel(`appointments:${barberId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `barber_id=eq.${barberId}`,
      }, () => { loadAppts(selected); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [barberId, selected]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppts(selected);
    setRefreshing(false);
  }, [selected, loadAppts]);

  function prevWeek() { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); }
  function nextWeek() { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); }

  const weekLabel = (() => {
    const st = weekDays[0]; const en = weekDays[6];
    if (st.getMonth() === en.getMonth())
      return `${st.getDate()} – ${en.getDate()} ${MONTHS_FR[en.getMonth()]} ${en.getFullYear()}`;
    return `${st.getDate()} ${MONTHS_FR[st.getMonth()]} – ${en.getDate()} ${MONTHS_FR[en.getMonth()]}`;
  })();

  const selectedLabel = selected.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* ── Week navigation ── */}
      <View style={s.weekNav}>
        <Pressable onPress={prevWeek} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={s.weekLabel}>{weekLabel}</Text>
        <Pressable onPress={nextWeek} hitSlop={12}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* ── Day strip ── */}
      <View style={s.dayStrip}>
        {weekDays.map((day) => {
          const isToday    = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selected);
          return (
            <Pressable key={day.toISOString()} onPress={() => setSelected(day)} style={s.dayBtn}>
              <Text style={[s.dayName, isSelected && s.dayNameSel]}>
                {DAYS_SHORT[day.getDay()]}
              </Text>
              <View style={[s.dayCircle, isSelected && s.dayCircleSel]}>
                <Text style={[s.dayNum, isSelected && s.dayNumSel]}>{day.getDate()}</Text>
              </View>
              <View style={[s.todayDot, { opacity: isToday ? 1 : 0 }, isSelected && { backgroundColor: '#fff' }]} />
            </Pressable>
          );
        })}
      </View>

      {/* ── Day header ── */}
      <View style={s.dayHeader}>
        <Text style={s.dayHeaderText}>{selectedLabel}</Text>
        <View style={s.countBadge}>
          <Text style={s.countBadgeText}>{appts.length} RDV</Text>
        </View>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.electric} size="large" />
        </View>
      ) : (
        <FlatList
          data={appts}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={44} color={colors.textFaint} />
              <Text style={s.emptyTitle}>Journée libre</Text>
              <Text style={s.emptySub}>Aucun rendez-vous ce jour.</Text>
            </View>
          }
          renderItem={({ item: a }) => {
            const st    = STATUS[a.status] ?? STATUS.confirmed;
            const start = new Date(a.starts_at);
            const dur   = (a.services as any)?.duration_minutes as number | undefined;
            const endStr = a.ends_at
              ? new Date(a.ends_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : dur
                ? (() => { const e = new Date(start); e.setMinutes(e.getMinutes() + dur); return e.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); })()
                : null;

            return (
              <Link href={`/appointment/${a.id}`} asChild>
                <Pressable style={s.apptCard}>
                  <View style={[s.statusBar, { backgroundColor: st.color }]} />
                  <View style={s.timeCol}>
                    <Text style={s.timeStart}>
                      {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {endStr ? <Text style={s.timeEnd}>{endStr}</Text> : null}
                    {dur ? <Text style={s.timeDur}>{dur}min</Text> : null}
                  </View>
                  <View style={{ flex: 1, paddingVertical: spacing.md }}>
                    <View style={s.apptTopRow}>
                      <View style={s.initials}>
                        <Text style={s.initialsText}>{getInitials(a.customer_name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.clientName}>{a.customer_name}</Text>
                        <Text style={s.serviceName}>{(a.services as any)?.name ?? ''}</Text>
                        {(a.stylists as any)?.name
                          ? <Text style={s.stylistName}>avec {(a.stylists as any).name}</Text>
                          : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={s.price}>{formatPrice(a.price_cents)}</Text>
                        <View style={[s.chip, { backgroundColor: st.bg }]}>
                          <Text style={[s.chipText, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textFaint} style={{ paddingRight: 10 }} />
                </Pressable>
              </Link>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  weekNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 14 },
  weekLabel: { color: colors.text, fontWeight: '700', fontSize: 14 },

  dayStrip:    { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayBtn:      { alignItems: 'center', gap: 3, flex: 1 },
  dayName:     { color: colors.textFaint, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  dayNameSel:  { color: colors.electric },
  dayCircle:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCircleSel:{ backgroundColor: colors.electric },
  dayNum:      { color: colors.textDim, fontSize: 14, fontWeight: '700' },
  dayNumSel:   { color: '#fff' },
  todayDot:    { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.electric },

  dayHeader:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12 },
  dayHeaderText:  { color: colors.text, fontSize: 14, fontWeight: '700', textTransform: 'capitalize', flex: 1 },
  countBadge:     { backgroundColor: colors.electricDim, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  countBadgeText: { color: colors.electric, fontSize: 11, fontWeight: '700' },

  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },

  apptCard:   { flexDirection: 'row', alignItems: 'stretch', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  statusBar:  { width: 3 },
  timeCol:    { width: 56, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, gap: 2, borderRightWidth: 1, borderRightColor: colors.border },
  timeStart:  { color: colors.text, fontSize: 13, fontWeight: '800' },
  timeEnd:    { color: colors.textFaint, fontSize: 11 },
  timeDur:    { color: colors.textFaint, fontSize: 10, marginTop: 2 },

  apptTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 4 },
  initials:   { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.electricDim, alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: colors.electric, fontWeight: '700', fontSize: 12 },
  clientName: { color: colors.text, fontWeight: '600', fontSize: 14 },
  serviceName:{ color: colors.textDim, fontSize: 12, marginTop: 1 },
  stylistName:{ color: colors.textFaint, fontSize: 11, marginTop: 1 },
  price:      { color: colors.text, fontWeight: '700', fontSize: 13 },
  chip:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  chipText:   { fontSize: 10, fontWeight: '600' },

  empty:      { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
  emptySub:   { color: colors.textFaint, fontSize: 13 },
});
