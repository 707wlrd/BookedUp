import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type Kind = 'caption' | 'story' | 'reminder';

interface Service { id: string; name: string }
interface Slot    { day: string; times: string }

const TOOLS: { key: Kind; icon: any; title: string; sub: string }[] = [
  { key: 'caption',  icon: 'chatbubble-ellipses-outline', title: 'Caption Instagram',     sub: 'Génère 3 captions prêts à poster.' },
  { key: 'story',    icon: 'image-outline',                title: 'Story créneaux dispos', sub: 'Annonce tes slots libres en 1 clic.' },
  { key: 'reminder', icon: 'notifications-outline',        title: 'Rappel SMS',             sub: 'Texte court et chaleureux.' },
];

const VIBES = ['Street / Urban', 'Luxe / Premium', 'Friendly', 'Minimal', 'Hype / Viral'];

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function AIScreen() {
  // Barber data
  const [shopName, setShopName]   = useState('');
  const [barberId, setBarberId]   = useState<string | null>(null);
  const [services, setServices]   = useState<Service[]>([]);
  const [token, setToken]         = useState<string | null>(null);

  // Tool state
  const [kind, setKind]           = useState<Kind>('caption');

  // Caption inputs
  const [service, setService]     = useState('');
  const [vibe, setVibe]           = useState(VIBES[0]);

  // Story inputs
  const [slots, setSlots]         = useState<Slot[]>([{ day: 'Vendredi', times: '11:00, 15:30' }]);

  // Reminder inputs
  const [clientName, setClientName]       = useState('');
  const [reminderService, setReminderService] = useState('');
  const [when, setWhen]                   = useState('');

  // Output
  const [output, setOutput]       = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef                 = useRef<ScrollView>(null);

  /* ── Load barber data + auth token ── */
  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setToken(session.access_token);

    const { data: barber } = await supabase
      .from('barbers')
      .select('id, shop_name')
      .eq('owner_id', session.user.id)
      .single();
    if (!barber) return;
    setShopName(barber.shop_name);
    setBarberId(barber.id);

    const { data: svcs } = await supabase
      .from('services')
      .select('id, name')
      .eq('barber_id', barber.id)
      .eq('is_active', true)
      .order('sort_order');
    if (svcs?.length) {
      setServices(svcs);
      setService(svcs[0].name);
      setReminderService(svcs[0].name);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Generate (streaming) ── */
  async function generate() {
    if (!token) {
      setOutput('⚠️ Tu dois être connecté pour utiliser l\'AI Studio.');
      return;
    }
    setOutput('');
    setStreaming(true);

    const body: Record<string, any> = { kind, shopName, barberId };
    if (kind === 'caption')  { body.service = service; body.vibe = vibe; }
    if (kind === 'story')    {
      body.slots = slots.map(s => ({
        day: s.day,
        times: s.times.split(',').map((t: string) => t.trim()).filter(Boolean),
      }));
    }
    if (kind === 'reminder') {
      body.customerName = clientName;
      body.service = reminderService;
      body.when = when;
    }

    try {
      const res = await fetch(`${API}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        setOutput(`⚠️ Erreur ${res.status}${err ? ` — ${err}` : ''}`);
        return;
      }

      // React Native fetch doesn't support ReadableStream — read body as text
      const text = await res.text();
      setOutput(text);
    } catch {
      setOutput('⚠️ Erreur de connexion. Vérifie ta connexion internet.');
    } finally {
      setStreaming(false);
    }
  }

  const canGenerate = !streaming && !!shopName && (
    kind !== 'reminder' || (!!clientName && !!when)
  );

  return (
    <ScrollView
      ref={scrollRef}
      style={s.scroll}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={s.header}>
        <Ionicons name="sparkles" size={20} color={colors.electric} />
        <Text style={s.headerTitle}>AI Studio</Text>
        {shopName ? (
          <View style={s.shopChip}>
            <Text style={s.shopChipText}>{shopName}</Text>
          </View>
        ) : null}
      </View>

      {/* Tool selector */}
      <View style={s.toolsRow}>
        {TOOLS.map((t) => {
          const active = kind === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => { setKind(t.key); setOutput(''); }}
              style={[s.tool, active && s.toolActive]}
            >
              <Ionicons name={t.icon} size={18} color={active ? colors.electric : colors.textDim} />
              <Text style={[s.toolTitle, active && { color: colors.text }]}>{t.title}</Text>
              <Text style={s.toolSub}>{t.sub}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Inputs */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Paramètres</Text>

        {/* Caption */}
        {kind === 'caption' && (
          <>
            <Text style={s.inputLabel}>Prestation mise en avant</Text>
            {services.length > 0 ? (
              <View style={s.pills}>
                {services.map((sv) => (
                  <Pressable
                    key={sv.id}
                    onPress={() => setService(sv.name)}
                    style={[s.pill, service === sv.name && s.pillActive]}
                  >
                    <Text style={[s.pillText, service === sv.name && s.pillTextActive]}>
                      {sv.name}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setService('')}
                  style={[s.pill, service === '' && s.pillActive]}
                >
                  <Text style={[s.pillText, service === '' && s.pillTextActive]}>Général</Text>
                </Pressable>
              </View>
            ) : (
              <TextInput
                value={service}
                onChangeText={setService}
                style={s.input}
                placeholder="Fade, coupe, barbe…"
                placeholderTextColor={colors.textFaint}
              />
            )}

            <Text style={[s.inputLabel, { marginTop: spacing.sm }]}>Vibe</Text>
            <View style={s.pills}>
              {VIBES.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setVibe(v)}
                  style={[s.pill, vibe === v && s.pillActive]}
                >
                  <Text style={[s.pillText, vibe === v && s.pillTextActive]}>{v}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Story */}
        {kind === 'story' && (
          <>
            <Text style={s.inputLabel}>Créneaux disponibles</Text>
            {slots.map((sl, i) => (
              <View key={i} style={s.slotRow}>
                <TextInput
                  value={sl.day}
                  onChangeText={(v) => setSlots(s2 => s2.map((x, idx) => idx === i ? { ...x, day: v } : x))}
                  style={[s.input, { flex: 1 }]}
                  placeholder="Jour"
                  placeholderTextColor={colors.textFaint}
                />
                <TextInput
                  value={sl.times}
                  onChangeText={(v) => setSlots(s2 => s2.map((x, idx) => idx === i ? { ...x, times: v } : x))}
                  style={[s.input, { flex: 2 }]}
                  placeholder="11:00, 15:30"
                  placeholderTextColor={colors.textFaint}
                />
                {slots.length > 1 && (
                  <Pressable onPress={() => setSlots(s2 => s2.filter((_, idx) => idx !== i))}>
                    <Ionicons name="close-circle" size={20} color={colors.textFaint} />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable
              onPress={() => setSlots(s2 => [...s2, { day: '', times: '' }])}
              style={s.addSlot}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.electric} />
              <Text style={s.addSlotText}>Ajouter un jour</Text>
            </Pressable>
          </>
        )}

        {/* Reminder */}
        {kind === 'reminder' && (
          <>
            <Text style={s.inputLabel}>Nom du client</Text>
            <TextInput
              value={clientName}
              onChangeText={setClientName}
              style={s.input}
              placeholder="Karim"
              placeholderTextColor={colors.textFaint}
            />
            <Text style={[s.inputLabel, { marginTop: spacing.sm }]}>Prestation</Text>
            {services.length > 0 ? (
              <View style={s.pills}>
                {services.map((sv) => (
                  <Pressable
                    key={sv.id}
                    onPress={() => setReminderService(sv.name)}
                    style={[s.pill, reminderService === sv.name && s.pillActive]}
                  >
                    <Text style={[s.pillText, reminderService === sv.name && s.pillTextActive]}>
                      {sv.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <TextInput
                value={reminderService}
                onChangeText={setReminderService}
                style={s.input}
                placeholder="Fade + barbe"
                placeholderTextColor={colors.textFaint}
              />
            )}
            <Text style={[s.inputLabel, { marginTop: spacing.sm }]}>Quand</Text>
            <TextInput
              value={when}
              onChangeText={setWhen}
              style={s.input}
              placeholder="demain à 15h30"
              placeholderTextColor={colors.textFaint}
            />
          </>
        )}
      </View>

      {/* Output */}
      <View style={s.card}>
        <View style={s.outputHeader}>
          <Text style={s.cardLabel}>Résultat</Text>
          {output && !streaming && (
            <Pressable
              onPress={() => Share.share({ message: output })}
              style={s.shareBtn}
            >
              <Ionicons name="share-outline" size={14} color={colors.electric} />
              <Text style={s.shareBtnText}>Partager</Text>
            </Pressable>
          )}
        </View>
        <View style={s.outputBody}>
          {streaming ? (
            <ActivityIndicator color={colors.electric} />
          ) : output ? (
            <Text style={s.outputText}>{output}</Text>
          ) : (
            <Text style={s.outputPlaceholder}>
              Configure les paramètres et appuie sur "Générer".
            </Text>
          )}
        </View>
        {output && !streaming && (
          <Text style={s.charCount}>{output.length} caractères</Text>
        )}
      </View>

      {/* CTA */}
      <Pressable
        onPress={generate}
        disabled={!canGenerate}
        style={[s.cta, !canGenerate && s.ctaDisabled]}
      >
        {streaming ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="sparkles" size={18} color="#fff" />
        )}
        <Text style={s.ctaText}>{streaming ? 'Génération…' : 'Générer'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: 100, gap: spacing.md },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '700', flex: 1 },
  shopChip: {
    backgroundColor: 'rgba(59,130,255,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  shopChipText: { color: colors.electric, fontSize: 12, fontWeight: '600' },

  toolsRow: { gap: spacing.sm },
  tool: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  toolActive: { borderColor: 'rgba(59,130,255,0.4)', backgroundColor: 'rgba(59,130,255,0.06)' },
  toolTitle:  { color: colors.textDim, fontWeight: '600', marginTop: 6 },
  toolSub:    { color: colors.textFaint, fontSize: 12, marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardLabel: {
    color: colors.textFaint, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  inputLabel: { color: colors.textDim, fontSize: 12, fontWeight: '500', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  pillActive: { borderColor: 'rgba(59,130,255,0.5)', backgroundColor: 'rgba(59,130,255,0.1)' },
  pillText: { color: colors.textDim, fontSize: 12, fontWeight: '500' },
  pillTextActive: { color: colors.electric },

  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  addSlot: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  addSlotText: { color: colors.electric, fontSize: 13 },

  outputHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  outputBody: { minHeight: 100 },
  outputText: { color: colors.text, lineHeight: 22 },
  outputPlaceholder: { color: colors.textFaint },
  charCount: { color: colors.textFaint, fontSize: 11, textAlign: 'right', marginTop: spacing.sm },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 1,
    borderColor: 'rgba(59,130,255,0.3)',
  },
  shareBtnText: { color: colors.electric, fontSize: 12 },

  cta: {
    backgroundColor: colors.electric,
    borderRadius: radius.full,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#fff', fontWeight: '600' },
});
