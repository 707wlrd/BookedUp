import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';

type Kind = 'caption' | 'story' | 'reminder';

const TOOLS: { key: Kind; icon: any; title: string; sub: string }[] = [
  { key: 'caption',  icon: 'chatbubble-ellipses-outline', title: 'Caption Instagram',     sub: 'Posts, before/after, promos.' },
  { key: 'story',    icon: 'image-outline',                title: 'Story créneaux dispos', sub: 'Affiche tes slots du jour.' },
  { key: 'reminder', icon: 'notifications-outline',        title: 'Rappel SMS',             sub: 'Texte court et chaleureux.' },
];

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function AIScreen() {
  const [kind, setKind] = useState<Kind>('story');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ai/${kind}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          shopName: 'Malik Cuts',
          service: 'Fade + barbe',
          customerName: 'Karim',
          when: 'demain 15h30',
          slots: [{ day: 'Vendredi', times: ['11:00', '15:30'] }],
        }),
      });
      const json = await res.json();
      setOutput(json.output ?? '');
    } catch {
      setOutput('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.toolsRow}>
        {TOOLS.map((t) => {
          const active = kind === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => { setKind(t.key); setOutput(''); }}
              style={[s.tool, active && s.toolActive]}
            >
              <Ionicons name={t.icon} size={20} color={active ? colors.electric : colors.textDim} />
              <Text style={[s.toolTitle, active && { color: colors.text }]}>{t.title}</Text>
              <Text style={s.toolSub}>{t.sub}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.output}>
        <Text style={s.outputLabel}>Résultat</Text>
        <View style={s.outputBody}>
          {loading ? (
            <ActivityIndicator color={colors.electric} />
          ) : output ? (
            <Text style={s.outputText}>{output}</Text>
          ) : (
            <Text style={s.outputPlaceholder}>Tape sur "Générer" pour créer ton contenu.</Text>
          )}
        </View>
        {output && (
          <Pressable onPress={() => Share.share({ message: output })} style={s.copyBtn}>
            <Ionicons name="share-outline" size={14} color={colors.text} />
            <Text style={s.copyText}>Partager</Text>
          </Pressable>
        )}
      </View>

      <Pressable onPress={generate} disabled={loading} style={s.cta}>
        <Ionicons name="sparkles" size={18} color="#fff" />
        <Text style={s.ctaText}>{loading ? 'Génération…' : 'Générer'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
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
  output: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  outputLabel: { color: colors.textFaint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  outputBody:  { minHeight: 140, marginTop: spacing.sm },
  outputText:  { color: colors.text, lineHeight: 22 },
  outputPlaceholder: { color: colors.textFaint },
  copyBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyText: { color: colors.text, fontSize: 12 },
  cta: {
    backgroundColor: colors.electric,
    borderRadius: radius.full,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaText: { color: '#fff', fontWeight: '600' },
});
