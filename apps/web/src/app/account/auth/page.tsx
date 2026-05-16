'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Mail, Lock, User } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'signup';

export default function AccountAuthPage() {
  const router = useRouter();
  const [mode, setMode]         = useState<AuthMode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError('Email ou mot de passe incorrect.');
        return;
      }
      router.push('/account');
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() || undefined },
          emailRedirectTo: `${window.location.origin}/account`,
        },
      });
      setLoading(false);
      if (error) {
        setError(
          error.message.includes('already registered')
            ? 'Un compte existe déjà avec cet email. Connecte-toi.'
            : 'Une erreur est survenue. Réessaie.',
        );
        return;
      }
      setSuccess('Vérifie ta boîte mail pour confirmer ton compte.');
    }
  }

  return (
    <AuthShell
      title={mode === 'login' ? 'Bon retour.' : 'Crée ton compte.'}
      subtitle={
        mode === 'login'
          ? 'Accède à tes rendez-vous et ton historique.'
          : 'Réserve chez tes barbers préférés, en 30 secondes.'
      }
      footer={
        mode === 'login' ? (
          <>
            Pas encore de compte ?{' '}
            <button
              onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
              className="font-medium text-electric-400 hover:text-electric-300"
            >
              Créer un compte →
            </button>
          </>
        ) : (
          <>
            Déjà un compte ?{' '}
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className="font-medium text-electric-400 hover:text-electric-300"
            >
              Se connecter →
            </button>
          </>
        )
      }
    >
      {/* Mode toggle (pill) */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1">
        {([
          { key: 'login',  label: 'Connexion' },
          { key: 'signup', label: 'Inscription' },
        ] as const).map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setMode(t.key); setError(null); setSuccess(null); }}
            className={cn(
              'flex-1 rounded-xl py-2 text-sm font-medium transition-all',
              mode === t.key
                ? 'bg-white/[0.07] text-white'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">

        {/* Full name — signup only */}
        {mode === 'signup' && (
          <div>
            <label className="label">Prénom &amp; nom</label>
            <div className="relative mt-1.5">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                autoComplete="name"
                className="input pl-10"
                placeholder="Jean Dupont"
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label className="label">Email</label>
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input pl-10"
              placeholder="toi@exemple.com"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="label">Mot de passe</label>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="input pl-10 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white/60"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {mode === 'signup' && (
            <p className="mt-1.5 text-[11px] text-white/35">8 caractères minimum</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading || !!success}>
          {loading ? (mode === 'login' ? 'Connexion…' : 'Inscription…') : (
            <>
              <span>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
