import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';
import { formatPrice } from '@bookedup/shared';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type Appt = {
  id: string;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: string;
  price_cents: number;
  deposit_cents: number;
  payment_status: string;
  notes: string | null;
  recurring_series_id: string | null;
  services: { name: string; duration_minutes: number } | null;
  stylists: { name: string } | null;
};

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [appt, setAppt] = useState<Appt | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancellingAll, setCancellingAll] = useState(false);

  useEffect(() => {
    supabase
      .from('appointments')
      .select('*, services(name, duration_minutes), stylists(name)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setAppt(data as any);
        setLoading(false);
      });
  }, [id]);

  async function cancelSeries() {
    if (!appt?.recurring_series_id) return;
    Alert.alert(
      'Annuler toute la série ?',
      'Tous les prochains rendez-vous de cette série récurrente seront annulés. Cette action est irréversible.',
      [
        { text: 'Non, garder', style: 'cancel' },
        {
          text: 'Annuler la série',
          style: 'destructive',
          onPress: async () => {
            setCancellingAll(true);
            try {
              await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('recurring_series_id', appt.recurring_series_id!)
                .gte('starts_at', new Date().toISOString())
                .neq('id', appt.id);
              // Annuler aussi le RDV courant
              await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', appt.id);
              setAppt(prev => prev ? { ...prev, status: 'cancelled' } : prev);
            } catch {
              Alert.alert('Erreur', 'Impossible d\'annuler la série. Réessayez.');
            } finally {
              setCancellingAll(false);
            }
          },
        },
      ],
    );
  }

  async function updateStatus(status: string) {
    if (!appt) return;
    setUpdating(true);
    await supabase.from('appointments').update({ status }).eq('id', appt.id);
    setAppt(prev => prev ? { ...prev, status } : prev);
    setUpdating(false);
    if (status === 'cancelled') router.back();
  }

  function confirmUpdate(title: string, message: string, status: string, destructive = false) {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        style: destructive ? 'destructive' : 'default',
        onPress: () => updateStatus(status),
      },
    ]);
  }

  function handleCancelViaApi() {
    if (!appt) return;
    Alert.alert(
      'Annuler ce rendez-vous ?',
      'Cette action est irréversible. Le rendez-vous sera annulé.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            if (!API_URL) {
              Alert.alert('Erreur', 'URL de l\'API non configurée.');
              return;
            }
            setCancelling(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const res = await fetch(`${API_URL}/api/cancel/${appt.id}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(session?.access_token
                    ? { Authorization: `Bearer ${session.access_token}` }
                    : {}),
                },
              });
              if (!res.ok) throw new Error(`Erreur ${res.status}`);
              setAppt(prev => prev ? { ...prev, status: 'cancelled' } : prev);
            } catch (err) {
              Alert.alert('Erreur', 'Impossible d\'annuler le rendez-vous. Réessayez plus tard.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.electric} size="large" />
      </View>
    );
  }

  if (!appt) {
    return (
      <View style={s.centered}>
        <Ionicons name="alert-circle-outline" size={36} color={colors.textFaint} />
        <Text style={s.emptyText}>Rendez-vous introuvable</Text>
      </View>
    );
  }

  const service   = appt.services as any;
  const stylist   = appt.stylists as any;
  const startsAt  = new Date(appt.starts_at);
  const isRecurring = !!appt.recurring_series_id;

  const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
    confirmed: { label: 'Confirmé',   bg: 'rgba(59,130,255,0.10)',  color: colors.electric, icon: 'checkmark-circle' },
    pending:   { label: 'En attente', bg: 'rgba(245,158,11,0.10)', color: colors.warning,  icon: 'time' },
    completed: { label: 'Terminé',    bg: 'rgba(34,197,94,0.10)',  color: colors.success,  icon: 'checkmark-done-circle' },
    cancelled: { label: 'Annulé',     bg: 'rgba(239,68,68,0.10)',  color: colors.danger,   icon: 'close-circle' },
  };
  const sc = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.confirmed;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      {/* Status badge */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
          <Ionicons name={sc.icon as any} size={16} color={sc.color} />
          <Text style={[s.statusText, { color: sc.color }]}>{sc.label}</Text>
        </View>
        {isRecurring && (
          <View style={s.recurringBadge}>
            <Ionicons name="repeat" size={13} color={colors.electric} />
            <Text style={s.recurringText}>Récurrent</Text>
          </View>
        )}
      </View>

      {/* Client info */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Client</Text>
        <Text style={s.bigName}>{appt.customer_name}</Text>
        <View style={s.contactRow}>
          <Ionicons name="mail-outline" size={13} color={colors.textFaint} />
          <Text style={s.contactText}>{appt.customer_email}</Text>
        </View>
        {appt.customer_phone && (
          <View style={s.contactRow}>
            <Ionicons name="call-outline" size={13} color={colors.textFaint} />
            <Text style={s.contactText}>{appt.customer_phone}</Text>
          </View>
        )}
      </View>

      {/* Appointment info */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Rendez-vous</Text>
        <InfoRow icon="calendar-outline" label="Date"
          value={startsAt.toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        />
        <InfoRow icon="time-outline" label="Heure"
          value={startsAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        />
        <InfoRow icon="cut-outline" label="Service" value={service?.name ?? '—'} />
        {service?.duration_minutes && (
          <InfoRow icon="hourglass-outline" label="Durée" value={`${service.duration_minutes} min`} />
        )}
        {stylist?.name && (
          <InfoRow icon="person-outline" label="Coiffeur" value={stylist.name} />
        )}
      </View>

      {/* Payment */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Paiement</Text>
        <View style={s.amountRow}>
          <Text style={s.amountLabel}>Total</Text>
          <Text style={s.amountValue}>{formatPrice(appt.price_cents)}</Text>
        </View>
        {appt.deposit_cents > 0 && (
          <View style={s.depositRow}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={s.depositText}>Acompte de {formatPrice(appt.deposit_cents)} encaissé</Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {appt.notes && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Notes</Text>
          <Text style={s.notesText}>{appt.notes}</Text>
        </View>
      )}

      {/* Actions */}
      {appt.status === 'pending' && (
        <View style={s.actions}>
          <Pressable
            disabled={updating}
            onPress={() => updateStatus('confirmed')}
            style={[s.btn, s.btnPrimary]}
          >
            {updating ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={s.btnPrimaryText}>Confirmer le RDV</Text>
              </>
            )}
          </Pressable>
          <Pressable
            disabled={updating}
            onPress={() => confirmUpdate('Annuler ce RDV ?', 'Cette action est irréversible.', 'cancelled', true)}
            style={[s.btn, s.btnDanger]}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
            <Text style={s.btnDangerText}>Annuler</Text>
          </Pressable>
        </View>
      )}

      {appt.status === 'confirmed' && (
        <View style={s.actions}>
          <Pressable
            disabled={updating}
            onPress={() => confirmUpdate('Marquer comme terminé ?', 'Le RDV sera archivé.', 'completed')}
            style={[s.btn, s.btnPrimary]}
          >
            {updating ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
                <Text style={s.btnPrimaryText}>Marquer terminé</Text>
              </>
            )}
          </Pressable>
          <Pressable
            disabled={updating}
            onPress={() => confirmUpdate('No-show ?', 'Le client ne s\'est pas présenté ?', 'no_show', true)}
            style={[s.btn, s.btnGhost]}
          >
            <Ionicons name="person-remove-outline" size={18} color={colors.textDim} />
            <Text style={s.btnGhostText}>No-show</Text>
          </Pressable>
          <Pressable
            disabled={updating}
            onPress={() => confirmUpdate('Annuler ce RDV ?', 'Cette action est irréversible.', 'cancelled', true)}
            style={[s.btn, s.btnDanger]}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
            <Text style={s.btnDangerText}>Annuler</Text>
          </Pressable>
        </View>
      )}

      {/* Annulation client via API — visible si le RDV n'est pas encore annulé/terminé */}
      {(appt.status === 'pending' || appt.status === 'confirmed') && API_URL ? (
        <View style={s.cancelClientSection}>
          <Text style={s.cancelClientHint}>Vous êtes le client ? Vous pouvez annuler ce rendez-vous :</Text>
          <Pressable
            disabled={cancelling}
            onPress={handleCancelViaApi}
            style={[s.btn, s.btnCancelClient, cancelling && { opacity: 0.6 }]}
          >
            {cancelling ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={s.btnDangerText}>Annuler ce RDV</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      {/* Annuler toute la série récurrente */}
      {isRecurring && (appt.status === 'pending' || appt.status === 'confirmed') && (
        <View style={s.seriesSection}>
          <Text style={s.seriesHint}>Ce RDV fait partie d'une série récurrente.</Text>
          <Pressable
            onPress={cancelSeries}
            disabled={cancellingAll}
            style={[s.btn, s.btnSeriesCancel, cancellingAll && { opacity: 0.5 }]}
          >
            {cancellingAll
              ? <ActivityIndicator size="small" color={colors.warning} />
              : (
                <>
                  <Ionicons name="repeat" size={16} color={colors.warning} />
                  <Text style={s.btnSeriesCancelText}>Annuler toute la série</Text>
                </>
              )
            }
          </Pressable>
        </View>
      )}

      {appt.status === 'cancelled' && (
        <View style={s.cancelledBanner}>
          <Ionicons name="close-circle" size={20} color={colors.danger} />
          <Text style={s.cancelledBannerText}>Ce rendez-vous a été annulé.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoLeft}>
        <Ionicons name={icon as any} size={14} color={colors.textFaint} />
        <Text style={s.infoLabel}>{label}</Text>
      </View>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 60 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { color: colors.textFaint, fontSize: 14 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.full,
  },
  statusText: { fontWeight: '600', fontSize: 13 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  cardTitle: {
    color: colors.textFaint, fontSize: 10,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  bigName: { color: colors.text, fontSize: 22, fontWeight: '700' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  contactText: { color: colors.textDim, fontSize: 13 },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { color: colors.textFaint, fontSize: 13 },
  infoValue: { color: colors.text, fontWeight: '500', fontSize: 13, flexShrink: 1, textAlign: 'right', maxWidth: '60%' },

  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { color: colors.textDim, fontSize: 14 },
  amountValue: { color: colors.electric, fontSize: 26, fontWeight: '700' },
  depositRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  depositText: { color: colors.success, fontSize: 12 },

  notesText: { color: colors.textDim, fontSize: 13, lineHeight: 20 },

  actions: { gap: spacing.sm, marginTop: spacing.sm },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 14, borderRadius: radius.full,
  },
  btnPrimary: { backgroundColor: colors.electric },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  btnGhostText: { color: colors.text, fontWeight: '600' },
  btnDanger: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' },
  btnDangerText: { color: colors.danger, fontWeight: '600' },

  cancelClientSection: { marginTop: spacing.lg, gap: spacing.sm },
  cancelClientHint: { color: colors.textFaint, fontSize: 12, textAlign: 'center' },
  btnCancelClient: {
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },

  recurringBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
  },
  recurringText: { color: colors.electric, fontWeight: '600', fontSize: 12 },

  seriesSection: { marginTop: spacing.lg, gap: spacing.sm },
  seriesHint: { color: colors.textFaint, fontSize: 12, textAlign: 'center' },
  btnSeriesCancel: {
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    backgroundColor: 'rgba(245,158,11,0.06)',
  },
  btnSeriesCancelText: { color: colors.warning, fontWeight: '600', fontSize: 14 },

  cancelledBanner: {
    marginTop: spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: radius.lg, padding: spacing.md,
  },
  cancelledBannerText: { color: colors.danger, fontWeight: '600', fontSize: 14 },
});
