import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, View, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { colors, radius, spacing } from '@/lib/theme';
import { registerForPushAsync } from '@/lib/notifications';
import { formatPrice } from '@bookedup/shared';
import { supabase } from '@/lib/supabase';

type Appt = {
  id: string;
  starts_at: string;
  customer_name: string;
  status: string;
  price_cents: number;
  services: { name: string } | null;
};

export default function TodayScreen() {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [stats, setStats] = useState({ count: 0, revenue: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: barber } = await supabase
      .from('barbers')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!barber) return;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const { data } = await supabase
      .from('appointments')
      .select('id, starts_at, customer_name, status, price_cents, services(name)')
      .eq('barber_id', barber.id)
      .gte('starts_at', start)
      .lte('starts_at', end)
      .not('status', 'in', '("cancelled","no_show")')
      .order('starts_at');

    const list = (data ?? []) as Appt[];
    setAppts(list);

    const revenue = list
      .filter(a => a.status === 'confirmed' || a.status === 'completed')
      .reduce((sum, a) => sum + a.price_cents, 0);
    const pending = list.filter(a => a.status === 'pending').length;
    setStats({ count: list.length, revenue, pending });
  }, []);

  useEffect(() => {
    registerForPushAsync().catch(() => {});
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const now = new Date();
  const nextAppt = appts.find(a => new Date(a.starts_at) >= now);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />
      }
    >
      {/* Date header */}
      <Text style={s.dateLabel}>{todayLabel}</Text>

      {/* Stats */}
      <View style={s.statsRow}>
        <Stat label="RDV" value={String(stats.count)} />
        <Stat label="CA du jour" value={formatPrice(stats.revenue)} highlight />
        <Stat label="En attente" value={String(stats.pending)} warn={stats.pending > 0} />
      </View>

      {/* Next appointment card */}
      {nextAppt && (
        <Link href={`/appointment/${nextAppt.id}`} asChild>
          <Pressable style={s.nextCard}>
            <View style={s.nextDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.nextLabel}>Prochain RDV</Text>
              <Text style={s.nextTime}>
                {new Date(nextAppt.starts_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
              <Text style={s.nextName}>{nextAppt.customer_name}</Text>
              <Text style={s.nextService}>
                {(nextAppt.services as any)?.name ?? ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        </Link>
      )}

      {/* Programme */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Programme</Text>

        {appts.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={36} color={colors.textFaint} />
            <Text style={s.emptyTitle}>Journée libre</Text>
            <Text style={s.emptySub}>Aucun rendez-vous aujourd'hui.</Text>
          </View>
        ) : (
          appts.map((a) => {
            const isPast = new Date(a.starts_at) < now;
            return (
              <Link key={a.id} href={`/appointment/${a.id}`} asChild>
                <Pressable style={[s.row, isPast && s.rowPast]}>
                  <View style={s.timeCol}>
                    <Text style={[s.timeText, isPast && s.timePast]}>
                      {new Date(a.starts_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowTitle, isPast && s.textPast]}>{a.customer_name}</Text>
                    <Text style={s.rowSub}>{(a.services as any)?.name ?? ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[s.price, isPast && s.textPast]}>{formatPrice(a.price_cents)}</Text>
                    <StatusChip status={a.status} />
                  </View>
                </Pressable>
              </Link>
            );
          })
        )}
      </View>

      {/* IA CTA */}
      <Link href="/(tabs)/ai" asChild>
        <Pressable style={s.cta}>
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={s.ctaText}>Générer une story Instagram</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

function Stat({ label, value, highlight, warn }: {
  label: string; value: string; highlight?: boolean; warn?: boolean;
}) {
  return (
    <View style={[s.statCard, highlight && s.statHighlight, warn && s.statWarn]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, highlight && s.statValueHighlight]}>{value}</Text>
    </View>
  );
}

function StatusChip({ status }: { status: string }) {
  const configs: Record<string, { label: string; bg: string; color: string }> = {
    confirmed: { label: 'Confirmé',  bg: 'rgba(59,130,255,0.12)',  color: colors.electric },
    pending:   { label: 'Attente',   bg: 'rgba(245,158,11,0.12)', color: colors.warning },
    completed: { label: 'Terminé',   bg: 'rgba(34,197,94,0.12)',  color: colors.success },
    cancelled: { label: 'Annulé',    bg: 'rgba(239,68,68,0.12)',  color: colors.danger },
  };
  const c = configs[status] ?? configs.confirmed;
  return (
    <View style={[s.chip, { backgroundColor: c.bg }]}>
      <Text style={[s.chipText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: 80 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  dateLabel: {
    color: colors.textDim, fontSize: 13, textTransform: 'capitalize',
    marginBottom: spacing.md,
  },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  statHighlight: { borderColor: 'rgba(59,130,255,0.35)', backgroundColor: 'rgba(59,130,255,0.06)' },
  statWarn: { borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.04)' },
  statLabel: { color: colors.textFaint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 6 },
  statValueHighlight: { color: colors.electric },

  nextCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: 'rgba(59,130,255,0.08)', borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(59,130,255,0.25)',
    padding: spacing.md, marginBottom: spacing.md,
  },
  nextDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.electric },
  nextLabel: { color: colors.electric, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  nextTime: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 2 },
  nextName: { color: colors.text, fontWeight: '600', marginTop: 2 },
  nextService: { color: colors.textDim, fontSize: 12 },

  section: { marginTop: spacing.xs },
  sectionLabel: {
    color: colors.textFaint, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm,
  },
  rowPast: { opacity: 0.5 },
  timeCol: { width: 52 },
  timeText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  timePast: { color: colors.textDim },
  rowTitle: { color: colors.text, fontWeight: '600' },
  rowSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  price: { color: colors.text, fontWeight: '600', fontSize: 13 },
  textPast: { color: colors.textDim },

  chip: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.full,
  },
  chipText: { fontSize: 10, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 40, gap: spacing.sm },
  emptyTitle: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
  emptySub: { color: colors.textFaint, fontSize: 13 },

  cta: {
    marginTop: spacing.lg, backgroundColor: colors.electric,
    borderRadius: radius.full, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  ctaText: { color: '#fff', fontWeight: '600' },
});
