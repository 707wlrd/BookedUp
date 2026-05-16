'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Scissors, User } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Role = 'customer' | 'barber';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole: Role = searchParams.get('plan') ? 'barber' : 'customer';

  const [role, setRole] = useState<Role>(defaultRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const redirectTo = `${window.location.origin}/auth/callback?next=${
      role === 'barber' ? '/onboarding' : '/'
    }`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: redirectTo,
      },
    });

    setLoading(false);
    if (error) {
      if (error.message.includes('already registered')) {
        setError('Cet email est déjà utilisé. Connecte-toi plutôt.');
      } else {
        setError(error.message);
      }
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Vérifie ta boîte mail." subtitle={`Un lien de confirmation a été envoyé à ${email}.`}>
        <div className="space-y-4 text-sm text-white/60">
          <p>Clique sur le lien dans l&apos;email pour activer ton compte.</p>
          <p className="text-white/35 text-xs">
            Pas reçu ? Vérifie tes spams. Le lien expire dans 24h.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Crée ton compte."
      subtitle="Commence en 2 minutes — aucune carte requise."
      footer={
        <>
          Déjà un compte ?{' '}
          <Link href="/login" className="font-medium text-electric-400 hover:text-electric-300">
            Se connecter →
          </Link>
        </>
      }
    >
      {/* Role selector */}
      <div className="mb-6 grid grid-cols-2 gap-2">
        {([
          { key: 'customer', label: 'Je suis client',  Icon: User },
          { key: 'barber',   label: 'Je suis coiffeur',  Icon: Scissors },
        ] as { key: Role; label: string; Icon: React.ComponentType<{ className?: string }> }[]).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setRole(key)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-all duration-150',
              role === key
                ? 'border-electric-500/50 bg-electric-500/10 text-white shadow-glow'
                : 'border-white/[0.08] bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white',
            )}
          >
            <Icon className={cn('h-5 w-5', role === key ? 'text-electric-300' : 'text-white/30')} />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Nom complet</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
            className="input mt-1.5"
            placeholder="Malik Larbi"
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input mt-1.5"
            placeholder="toi@exemple.com"
          />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <div className="relative mt-1.5">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="input pr-10"
              placeholder="8 caractères minimum"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white/60"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Création…' : (
            <><span>Créer mon compte</span><ArrowRight className="h-4 w-4" /></>
          )}
        </Button>

        <p className="text-center text-[11px] text-white/30">
          En créant un compte tu acceptes nos{' '}
          <Link href="/legal/cgu" className="hover:text-white/60 underline">CGU</Link>
          {' '}et notre{' '}
          <Link href="/legal/confidentialite" className="hover:text-white/60 underline">politique de confidentialité</Link>.
        </p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[rgb(5,6,8)]" />}>
      <RegisterForm />
    </Suspense>
  );
}
