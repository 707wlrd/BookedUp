import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/lib/theme';
import { formatPrice } from '@bookedup/shared';
import { supabase } from '@/lib/supabase';

type Period = 'week' | 'month' | 'year';
type DayStat = { label: string; amount: number };
type ServiceStat = { name: string; count: number; revenue: number };

const DAYS_FR  = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function StatsScreen() {
  const insets = useSafeAreaInsets();

  const [period,      setPeriod]      = useState<Period>('month');
  const [revenue,     setRevenue]     = useState(0);
  const [prevRevenue, setPrevRevenue] = useState(0);
  const [rdvCount,    setRdvCount]    = useState(0);
  const [avgTicket,   setAvgTicket]   = useState(0);
  const [noShowRate,  setNoShowRate]  = useState(0);
  const [chartData,   setChartData]   = useState<DayStat[]>([]);
  const [topServices, setTopServices] = useState<ServiceStat[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const load = useCallback(async (p: Period) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: barber } = await supabase.from('barbers').select('id').eq('owner_id', user.id).single();
    if (!barber) return;

    const now = new Date();
    let start: Date, end: Date, prevStart: Date, prevEnd: Date;

    if (p === 'week') {
      const dow = now.getDay();
      start = new Date(now); start.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1)); start.setHours(0, 0, 0, 0);
      end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
      prevStart = new Date(start); prevStart.setDate(start.getDate() - 7);
      prevEnd   = new Date(end);   prevEnd.setDate(end.getDate() - 7);
    } else if (p === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd   = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    }

    const [curr, prev, all, services] = await Promise.all([
      supabase.from('appointments')
        .select('price_cents, starts_at, status')
        .eq('barber_id', barber.id)
        .gte('starts_at', start.toISOString()).lte('starts_at', end.toISOString()),
      supabase.from('appointments')
        .select('price_cents')
        .eq('barber_id', barber.id)
        .gte('starts_at', prevStart.toISOString()).lte('starts_at', prevEnd.toISOString())
        .in('status', ['confirmed', 'completed']),
      supabase.from('appointments')
        .select('price_cents, status')
        .eq('barber_id', barber.id)
        .gte('starts_at', start.toISOString()).lte('starts_at', end.toISOString()),
      supabase.from('appointments')
        .select('price_cents, status, services(name)')
        .eq('barber_id', barber.id)
        .gte('starts_at', start.toISOString()).lte('starts_at', end.toISOString())
        .in('status', ['confirmed', 'completed']),
    ]);

    const paid = (curr.data ?? []).filter(a => a.status === 'confirmed' || a.status === 'completed');
    const totalRev  = paid.reduce((s, a) => s + a.price_cents, 0);
    const prevRev   = (prev.data ?? []).reduce((s, a) => s + a.price_cents, 0);
    const allData   = all.data ?? [];
    const noShows   = allData.filter(a => a.status === 'no_show').length;

    setRevenue(totalRev);
    setPrevRevenue(prevRev);
    setRdvCount(paid.length);
    setAvgTicket(paid.length > 0 ? Math.round(totalRev / paid.length) : 0);
    setNoShowRate(allData.length > 0 ? Math.round((noShows / allData.length) * 100) : 0);

    // Chart data
    if (p === 'week') {
      const buckets = Array(7).fill(0);
      paid.forEach(a => {
        const d = new Date(a.starts_at); let dow = d.getDay() - 1; if (dow < 0) dow = 6;
        buckets[dow] += a.price_cents;
      });
      setChartData(DAYS_FR.map((label, i) => ({ label, amount: buckets[i] })));
    } else if (p === 'month') {
      const weeks: number[] = [0, 0, 0, 0, 0];
      paid.forEach(a => {
        const d = new Date(a.starts_at);
        const wk = Math.min(Math.floor((d.getDate() - 1) / 7), 4);
        weeks[wk] += a.price_cents;
      });
      setChartData(weeks.map((amount, i) => ({ label: `S${i + 1}`, amount })));
    } else {
      const months = Array(12).fill(0);
      paid.forEach(a => { months[new Date(a.starts_at).getMonth()] += a.price_cents; });
      setChartData(MONTHS_FR.map((label, i) => ({ label, amount: months[i] })));
    }

    // Top services
    const svcMap: Record<string, ServiceStat> = {};
    for (const a of services.data ?? []) {
      const name = (a.services as any)?.name ?? 'Autre';
      if (!svcMap[name]) svcMap[name] = { name, count: 0, revenue: 0 };
      svcMap[name].count += 1;
      svcMap[name].revenue += a.price_cents;
    }
    setTopServices(Object.values(svcMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
  }, []);

  useEffect(() => { load(period).finally(() => setLoading(false)); }, []);

  function changePeriod(p: Period) {
    setPeriod(p);
    setLoading(true);
    load(p).finally(() => setLoading(false));
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(period);
    setRefreshing(false);
  }, [period, load]);

  const evolution = prevRevenue > 0
    ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100)
    : null;

  const maxChart = Math.max(...chartData.map(d => d.amount), 1);

  const periodLabels: Record<Period, string> = {
    week: 'Cette semaine', month: 'Ce mois', year: 'Cette année',
  };

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: 100 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Title ── */}
      <Text style={s.pageTitle}>Statistiques</Text>

      {/* ── Period selector ── */}
      <View style={s.periodRow}>
        {(['week', 'month', 'year'] as Period[]).map(p => (
          <Pressable key={p} onPress={() => changePeriod(p)} style={[s.periodBtn, period === p && s.periodBtnActive]}>
            <Text style={[s.periodBtnText, period === p && s.periodBtnTextActive]}>
              {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={colors.electric} size="large" />
        </View>
      ) : (
        <>
          {/* ── Hero CA ── */}
          <View style={s.heroCard}>
            <View style={s.heroBadge}>
              <Ionicons name="trending-up" size={12} color={colors.electric} />
              <Text style={s.heroBadgeText}>{periodLabels[period]}</Text>
            </View>
            <Text style={s.heroValue}>{formatPrice(revenue)}</Text>
            <Text style={s.heroSub}>Chiffre d'affaires</Text>
            {evolution !== null && (
              <View style={[s.evolutionBadge, { backgroundColor: evolution >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                <Ionicons name={evolution >= 0 ? 'arrow-up' : 'arrow-down'} size={11} color={evolution >= 0 ? colors.success : colors.danger} />
                <Text style={[s.evolutionText, { color: evolution >= 0 ? colors.success : colors.danger }]}>
                  {Math.abs(evolution)}% vs période précédente
                </Text>
              </View>
            )}
          </View>

          {/* ── KPI row ── */}
          <View style={s.kpiRow}>
            <KpiCard label="RDV" value={String(rdvCount)} icon="calendar-outline" />
            <KpiCard label="Ticket moyen" value={formatPrice(avgTicket)} icon="receipt-outline" highlight />
            <KpiCard label="No-shows" value={`${noShowRate}%`} icon="close-circle-outline" warn={noShowRate > 10} />
          </View>

          {/* ── Bar chart ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Évolution du CA</Text>
            <View style={s.chart}>
              {chartData.map((d, i) => {
                const pct = Math.max(2, (d.amount / maxChart) * 100);
                const isActive = d.amount === Math.max(...chartData.map(x => x.amount));
                return (
                  <View key={i} style={s.barCol}>
                    {d.amount > 0 && (
                      <Text style={s.barVal}>{Math.round(d.amount / 100)}€</Text>
                    )}
                    <View style={s.barTrack}>
                      <View style={[s.bar, { height: `${pct}%`, backgroundColor: isActive ? colors.electric : 'rgba(124,58,237,0.3)' }]} />
                    </View>
                    <Text style={s.barLabel}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Top services ── */}
          {topServices.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Top prestations</Text>
              {topServices.map((svc, i) => {
                const pct = maxChart > 0 ? (svc.revenue / (topServices[0]?.revenue || 1)) : 0;
                return (
                  <View key={svc.name} style={s.svcRow}>
                    <View style={s.svcRank}>
                      <Text style={s.svcRankText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={s.svcTopRow}>
                        <Text style={s.svcName}>{svc.name}</Text>
                        <Text style={s.svcRevenue}>{formatPrice(svc.revenue)}</Text>
                      </View>
                      <View style={s.svcBar}>
                        <View style={[s.svcBarFill, { width: `${pct * 100}%` }]} />
                      </View>
                      <Text style={s.svcCount}>{svc.count} RDV</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function KpiCard({ label, value, icon, highlight, warn }: {
  label: string; value: string; icon: any; highlight?: boolean; warn?: boolean;
}) {
  return (
    <View style={[s.kpiCard, highlight && s.kpiHL, warn && s.kpiWarn]}>
      <Ionicons name={icon} size={16} color={highlight ? colors.electric : warn ? colors.warning : colors.textFaint} />
      <Text style={[s.kpiValue, highlight && { color: colors.electric }, warn && { color: colors.warning }]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.bg },
  content:  { paddingHorizontal: spacing.md, gap: spacing.md },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },

  pageTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },

  periodRow: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 4, borderWidth: 1, borderColor: colors.border },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, alignItems: 'center' },
  periodBtnActive: { backgroundColor: colors.electricDim },
  periodBtnText: { color: colors.textFaint, fontSize: 13, fontWeight: '600' },
  periodBtnTextActive: { color: colors.electric },

  heroCard: {
    backgroundColor: 'rgba(124,58,237,0.06)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)', padding: spacing.lg, gap: 6,
  },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: colors.electricDim, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  heroBadgeText: { color: colors.electric, fontSize: 11, fontWeight: '600' },
  heroValue: { color: colors.text, fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  heroSub:   { color: colors.textFaint, fontSize: 12 },
  evolutionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  evolutionText:  { fontSize: 12, fontWeight: '600' },

  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpiCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center', gap: 4 },
  kpiHL:   { borderColor: 'rgba(124,58,237,0.3)', backgroundColor: 'rgba(124,58,237,0.06)' },
  kpiWarn: { borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.04)' },
  kpiValue:{ color: colors.text, fontSize: 16, fontWeight: '800' },
  kpiLabel:{ color: colors.textFaint, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: spacing.md },

  chart:    { flexDirection: 'row', height: 130, gap: 4, alignItems: 'flex-end' },
  barCol:   { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barVal:   { color: colors.textFaint, fontSize: 8, marginBottom: 2 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar:      { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel: { color: colors.textFaint, fontSize: 9, marginTop: 4 },

  svcRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  svcRank:   { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.electricDim, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  svcRankText: { color: colors.electric, fontSize: 10, fontWeight: '800' },
  svcTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  svcName:   { color: colors.text, fontWeight: '600', fontSize: 13 },
  svcRevenue:{ color: colors.electric, fontWeight: '700', fontSize: 13 },
  svcBar:    { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2 },
  svcBarFill:{ height: 4, backgroundColor: colors.electric, borderRadius: 2 },
  svcCount:  { color: colors.textFaint, fontSize: 11 },
});
