import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { colors, radius, spacing } from '@/lib/theme';
import { formatPrice } from '@bookedup/shared';
import { supabase } from '@/lib/supabase';

type DayStat = { day: string; label: string; amount: number };

export default function RevenueScreen() {
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [prevMonthRevenue, setPrevMonthRevenue] = useState(0);
  const [noShowRate, setNoShowRate] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [weekData, setWeekData] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: barber } = await supabase
      .from('barbers').select('id').eq('owner_id', user.id).single();
    if (!barber) return;

    const now = new Date();

    // Current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Previous month
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    // This week (Mon-Sun)
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    weekStart.setHours(0, 0, 0, 0);

    const [currentMonth, prevMonth, weekAppts, totalMonth] = await Promise.all([
      supabase.from('appointments').select('price_cents, status')
        .eq('barber_id', barber.id)
        .gte('starts_at', monthStart).lte('starts_at', monthEnd)
        .in('status', ['confirmed', 'completed']),

      supabase.from('appointments').select('price_cents')
        .eq('barber_id', barber.id)
        .gte('starts_at', prevStart).lte('starts_at', prevEnd)
        .in('status', ['confirmed', 'completed']),

      supabase.from('appointments').select('starts_at, price_cents, status')
        .eq('barber_id', barber.id)
        .gte('starts_at', weekStart.toISOString()),

      supabase.from('appointments').select('price_cents, status')
        .eq('barber_id', barber.id)
        .gte('starts_at', monthStart).lte('starts_at', monthEnd),
    ]);

    const mRevenue = (currentMonth.data ?? []).reduce((s, a) => s + a.price_cents, 0);
    const pRevenue = (prevMonth.data ?? []).reduce((s, a) => s + a.price_cents, 0);
    const mCount = (currentMonth.data ?? []).length;

    const allMonth = totalMonth.data ?? [];
    const noShows = allMonth.filter(a => a.status === 'no_show').length;
    const noShowPct = allMonth.length > 0 ? Math.round((noShows / allMonth.length) * 100) : 0;
    const avg = mCount > 0 ? Math.round(mRevenue / mCount) : 0;

    setMonthRevenue(mRevenue);
    setMonthCount(mCount);
    setPrevMonthRevenue(pRevenue);
    setNoShowRate(noShowPct);
    setAvgTicket(avg);

    // Group week appointments by day
    const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const dayTotals = Array(7).fill(0);
    (weekAppts.data ?? [])
      .filter(a => a.status === 'confirmed' || a.status === 'completed')
      .forEach(a => {
        const d = new Date(a.starts_at);
        let dow = d.getDay() - 1; // Mon=0
        if (dow < 0) dow = 6;
        dayTotals[dow] += a.price_cents;
      });

    setWeekData(DAYS.map((label, i) => ({
      day: String(i),
      label,
      amount: dayTotals[i],
    })));
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  const evolution = prevMonthRevenue > 0
    ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
    : null;

  const maxWeek = Math.max(...weekData.map(d => d.amount), 1);

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />}
    >
      {/* Main KPI */}
      <View style={s.heroCard}>
        <Text style={s.heroLabel}>Chiffre d'affaires — ce mois</Text>
        <Text style={s.heroValue}>{formatPrice(monthRevenue)}</Text>
        {evolution !== null && (
          <View style={s.evolutionRow}>
            <Text style={[s.evolutionText, evolution >= 0 ? s.positiveText : s.negativeText]}>
              {evolution >= 0 ? '↑' : '↓'} {Math.abs(evolution)}%
            </Text>
            <Text style={s.evolutionSub}> vs mois dernier</Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statLabel}>RDV réalisés</Text>
          <Text style={s.statValue}>{monthCount}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Ticket moyen</Text>
          <Text style={s.statValue}>{formatPrice(avgTicket)}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statLabel}>No-shows</Text>
          <Text style={[s.statValue, noShowRate > 5 && { color: colors.warning }]}>
            {noShowRate}%
          </Text>
        </View>
      </View>

      {/* Week chart */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Cette semaine</Text>
        <View style={s.chart}>
          {weekData.map((d) => (
            <View key={d.day} style={s.barCol}>
              <Text style={s.barValue}>
                {d.amount > 0 ? `${Math.round(d.amount / 100)}€` : ''}
              </Text>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.bar,
                    {
                      height: `${Math.max(4, (d.amount / maxWeek) * 100)}%`,
                      backgroundColor: d.amount > 0 ? colors.electric : colors.border,
                    },
                  ]}
                />
              </View>
              <Text style={s.barLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  heroCard: {
    backgroundColor: 'rgba(59,130,255,0.07)',
    borderRadius: radius.xl, borderWidth: 1,
    borderColor: 'rgba(59,130,255,0.2)', padding: spacing.lg,
  },
  heroLabel: { color: colors.textFaint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: colors.text, fontSize: 36, fontWeight: '700', marginTop: 6, letterSpacing: -1 },
  evolutionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  evolutionText: { fontSize: 13, fontWeight: '600' },
  positiveText: { color: colors.success },
  negativeText: { color: colors.danger },
  evolutionSub: { color: colors.textFaint, fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  statLabel: { color: colors.textFaint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 4 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  cardLabel: {
    color: colors.textFaint, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md,
  },

  chart: { flexDirection: 'row', height: 140, gap: 6, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { color: colors.textFaint, fontSize: 8, marginBottom: 2 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel: { color: colors.textFaint, fontSize: 10, marginTop: 4 },
});
