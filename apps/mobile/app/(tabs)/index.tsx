import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/lib/theme';
import { registerForPushAsync } from '@/lib/notifications';
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

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();

  const [barberName, setBarberName] = useState('');
  const [shopName,   setShopName]   = useState('');
  const [appts,      setAppts]      = useState<Appt[]>([]);
  const [stats,      setStats]      = useState({ count: 0, revenue: 0, pending: 0 });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const name = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '';
    setBarberName(name);

    const { data: barber } = await supabase
      .from('barbers')
      .select('id, shop_name')
      .eq('owner_id', user.id)
      .single();
    if (!barber) return;

    setShopName(barber.shop_name ?? '');

    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const { data } = await supabase
      .from('appointments')
      .select('id, starts_at, ends_at, customer_name, status, price_cents, services(name, duration_minutes), stylists(name)')
      .eq('barber_id', barber.id)
      .gte('starts_at', start)
      .lte('starts_at', end)
      .not('status', 'in', '("cancelled","no_show")')
      .order('starts_at');

    const list = (data ?? []) as Appt[];
    setAppts(list);

    const revenue = list
      .filter(a => a.status === 'confirmed' || a.status === 'completed')
      .reduce((s, a) => s + a.price_cents, 0);
    const pending = list.filter(a => a.status === 'pending').length;
    setStats({ count: list.length, revenue, pending });
  }, []);

  useEffect(() => {
    registerForPushAsync().catch(() => {});
    load().finally(() => setLoading(false));

    // Realtime : rafraîchit le dashboard dès qu'un RDV du jour change
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('barbers').select('id').eq('owner_id', user.id).single().then(({ data: barber }) => {
        if (!barber) return;
        channel = supabase
          .channel(`home:${barber.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `barber_id=eq.${barber.id}` }, () => load())
          .subscribe();
      });
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const now       = new Date();
  const nextAppt  = appts.find(a => new Date(a.starts_at) >= now);
  const todayLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const initials  = getInitials(barberName || shopName || '?');

  if (loading) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.content, { paddingBottom: 100 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electric} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={s.greeting}>Bonjour 👋</Text>
          <Text style={s.shopName}>{shopName || barberName}</Text>
          <Text style={s.dateLabel}>{todayLabel}</Text>
        </View>
        <Pressable onPress={() => router.push('/profile')} style={s.avatarBtn}>
          <Text style={s.avatarText}>{initials}</Text>
        </Pressable>
      </View>

      {/* ── KPI cards ── */}
      <View style={s.statsRow}>
        <StatCard label="RDV aujourd'hui" value={String(stats.count)} icon="calendar" />
        <StatCard label="CA du jour" value={formatPrice(stats.revenue)} icon="cash" highlight />
        <StatCard label="En attente" value={String(stats.pending)} icon="time" warn={stats.pending > 0} />
      </View>

      {/* ── Prochain RDV ── */}
      {nextAppt ? (
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Prochain rendez-vous</Text>
        </View>
      ) : null}
      {nextAppt && (
        <Link href={`/appointment/${nextAppt.id}`} asChild>
          <Pressable style={s.nextCard}>
            <View style={s.nextLeft}>
              <View style={s.nextTimeBadge}>
                <Text style={s.nextTimeText}>
                  {new Date(nextAppt.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={s.nextDivider} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.nextClient}>{nextAppt.customer_name}</Text>
              <Text style={s.nextService}>{(nextAppt.services as any)?.name ?? ''}</Text>
              {(nextAppt.stylists as any)?.name ? (
                <Text style={s.nextStylist}>avec {(nextAppt.stylists as any).name}</Text>
              ) : null}
            </View>
            <View style={s.nextRight}>
              <Text style={s.nextPrice}>{formatPrice(nextAppt.price_cents)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </View>
          </Pressable>
        </Link>
      )}

      {/* ── Programme du jour ── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Programme du jour</Text>
        <Text style={s.sectionCount}>{appts.length} RDV</Text>
      </View>

      {appts.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="sunny-outline" size={40} color={colors.textFaint} />
          <Text style={s.emptyTitle}>Journée libre</Text>
          <Text style={s.emptySub}>Aucun rendez-vous prévu aujourd'hui.</Text>
        </View>
      ) : (
        appts.map((a, idx) => {
          const st     = STATUS[a.status] ?? STATUS.confirmed;
          const isPast = new Date(a.starts_at) < now;
          const start  = new Date(a.starts_at);
          const end    = a.ends_at ? new Date(a.ends_at) : null;
          const dur    = (a.services as any)?.duration_minutes;
          return (
            <Link key={a.id} href={`/appointment/${a.id}`} asChild>
              <Pressable style={[s.apptRow, isPast && s.apptPast]}>
                {/* Timeline */}
                <View style={s.timelineCol}>
                  <Text style={s.apptTime}>
                    {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {idx < appts.length - 1 && <View style={s.timelineLine} />}
                </View>

                {/* Card */}
                <View style={[s.apptCard, isPast && { opacity: 0.5 }]}>
                  <View style={s.apptCardRow}>
                    {/* Initials */}
                    <View style={s.clientInitials}>
                      <Text style={s.clientInitialsText}>
                        {getInitials(a.customer_name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.apptClient}>{a.customer_name}</Text>
                      <Text style={s.apptService}>{(a.services as any)?.name ?? ''}</Text>
                      {(a.stylists as any)?.name ? (
                        <Text style={s.apptStylist}>· {(a.stylists as any).name}</Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={s.apptPrice}>{formatPrice(a.price_cents)}</Text>
                      <View style={[s.chip, { backgroundColor: st.bg }]}>
                        <Text style={[s.chipText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                  </View>
                  {dur ? (
                    <View style={s.apptMeta}>
                      <Ionicons name="time-outline" size={11} color={colors.textFaint} />
                      <Text style={s.apptMetaText}>{dur} min</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            </Link>
          );
        })
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, icon, highlight, warn }: {
  label: string; value: string; icon: any; highlight?: boolean; warn?: boolean;
}) {
  return (
    <View style={[s.statCard, highlight && s.statHL, warn && s.statWarn]}>
      <Ionicons name={`${icon}-outline` as any} size={16} color={highlight ? colors.electric : warn ? colors.warning : colors.textFaint} />
      <Text style={[s.statValue, highlight && { color: colors.electric }, warn && { color: colors.warning }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.bg },
  content:  { paddingHorizontal: spacing.md },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  // Header
  header:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: spacing.lg },
  greeting:   { color: colors.textFaint, fontSize: 13 },
  shopName:   { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
  dateLabel:  { color: colors.textFaint, fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  avatarBtn:  { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.electricDim, borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.4)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.electric, fontWeight: '800', fontSize: 14 },

  // Stats
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center', gap: 4 },
  statHL:   { borderColor: 'rgba(124,58,237,0.3)', backgroundColor: 'rgba(124,58,237,0.06)' },
  statWarn: { borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.04)' },
  statValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
  statLabel: { color: colors.textFaint, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitle:  { color: colors.text, fontSize: 15, fontWeight: '700' },
  sectionCount:  { color: colors.textFaint, fontSize: 12 },

  // Next RDV
  nextCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
    padding: spacing.md, marginBottom: spacing.lg,
  },
  nextLeft:      { alignItems: 'center', gap: 4 },
  nextTimeBadge: { backgroundColor: colors.electric, borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 4 },
  nextTimeText:  { color: '#fff', fontWeight: '800', fontSize: 13 },
  nextDivider:   { width: 1, flex: 1, backgroundColor: 'rgba(124,58,237,0.3)' },
  nextClient:    { color: colors.text, fontWeight: '700', fontSize: 15 },
  nextService:   { color: colors.textDim, fontSize: 13, marginTop: 2 },
  nextStylist:   { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  nextRight:     { alignItems: 'flex-end', gap: 4 },
  nextPrice:     { color: colors.electric, fontWeight: '700', fontSize: 14 },

  // Timeline
  apptRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, gap: 10 },
  apptPast:    {},
  timelineCol: { width: 46, alignItems: 'center', paddingTop: 14 },
  apptTime:    { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  timelineLine:{ width: 1, flex: 1, backgroundColor: colors.border, marginTop: 6 },

  apptCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  apptCardRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clientInitials: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.electricDim, alignItems: 'center', justifyContent: 'center' },
  clientInitialsText: { color: colors.electric, fontWeight: '700', fontSize: 12 },
  apptClient:   { color: colors.text, fontWeight: '600', fontSize: 14 },
  apptService:  { color: colors.textDim, fontSize: 12, marginTop: 1 },
  apptStylist:  { color: colors.textFaint, fontSize: 11, marginTop: 1 },
  apptPrice:    { color: colors.text, fontWeight: '600', fontSize: 13 },
  apptMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  apptMetaText: { color: colors.textFaint, fontSize: 11 },

  chip:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  chipText: { fontSize: 10, fontWeight: '600' },

  empty:      { alignItems: 'center', paddingVertical: 48, gap: spacing.sm },
  emptyTitle: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
  emptySub:   { color: colors.textFaint, fontSize: 13 },
});
