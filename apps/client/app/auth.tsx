'use client';
import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/lib/theme';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const [mode, setMode]         = useState<Mode>('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [sent, setSent]         = useState(false);

  async function handleSubmit() {
    if (!email || !password) { setError('Remplis tous les champs.'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Entre ton prénom.'); return; }
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) setError(translateError(e.message));
      } else {
        const { error: e } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim(), role: 'client' } },
        });
        if (e) setError(translateError(e.message));
        else setSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.header}>
          <View style={s.logoBox}>
            <Ionicons name="flash" size={22} color="#fff" />
          </View>
          <Text style={s.logoText}>BookedUp</Text>
          <Text style={s.tagline}>Réserve en 30 secondes</Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </Text>

          {sent ? (
            <View style={s.successBox}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={s.successTitle}>Email envoyé !</Text>
              <Text style={s.successSub}>Clique sur le lien de confirmation dans ta boîte mail.</Text>
              <Pressable onPress={() => { setSent(false); setMode('login'); }} style={s.backBtn}>
                <Text style={s.backBtnText}>Connexion</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {mode === 'signup' && (
                <View style={s.field}>
                  <Text style={s.label}>Prénom</Text>
                  <TextInput
                    style={s.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Karim"
                    placeholderTextColor={colors.textFaint}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              )}

              <View style={s.field}>
                <Text style={s.label}>Email</Text>
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="toi@email.com"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View style={s.field}>
                <Text style={s.label}>Mot de passe</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={[s.input, { flex: 1, borderWidth: 0, padding: 0 }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textFaint}
                    secureTextEntry={!showPwd}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <Pressable onPress={() => setShowPwd(v => !v)} hitSlop={8}>
                    <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textDim} />
                  </Pressable>
                </View>
              </View>

              {error ? (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable onPress={handleSubmit} disabled={loading} style={[s.btn, loading && { opacity: 0.7 }]}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</Text>
                }
              </Pressable>
            </>
          )}
        </View>

        <Pressable onPress={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }} style={s.switchRow}>
          <Text style={s.switchText}>
            {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <Text style={{ color: colors.electric, fontWeight: '600' }}>
              {mode === 'login' ? "S'inscrire" : 'Se connecter'}
            </Text>
          </Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function translateError(msg: string) {
  if (msg.includes('Invalid login'))       return 'Email ou mot de passe incorrect.';
  if (msg.includes('Email not confirmed')) return 'Confirme ton email avant de te connecter.';
  if (msg.includes('already registered')) return 'Cet email est déjà utilisé.';
  if (msg.includes('Password should be')) return 'Mot de passe trop court (6 caractères min).';
  return msg;
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.bg },
  content:  { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingVertical: 60 },
  header:   { alignItems: 'center', marginBottom: spacing.xl },
  logoBox:  { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.electric, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoText: { color: colors.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  tagline:  { color: colors.textFaint, fontSize: 13, marginTop: 4 },
  card:     { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  title:    { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.lg },
  field:    { marginBottom: spacing.md },
  label:    { color: colors.textFaint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input:    { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.text, fontSize: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  errorText: { color: colors.danger, fontSize: 13, flex: 1 },
  btn:      { backgroundColor: colors.electric, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center', marginTop: spacing.sm },
  btnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  successBox:   { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  successTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  successSub:   { color: colors.textDim, textAlign: 'center', fontSize: 13, lineHeight: 20 },
  backBtn:      { marginTop: spacing.sm },
  backBtnText:  { color: colors.electric, fontWeight: '600' },
  switchRow: { alignItems: 'center', paddingVertical: spacing.sm },
  switchText: { color: colors.textDim, fontSize: 13 },
});
