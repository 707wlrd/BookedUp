'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/studio';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Email ou mot de passe incorrect.');
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
        <div className="flex items-center justify-between">
          <label className="label">Mot de passe</label>
          <Link href="/forgot-password" className="text-[11px] text-white/40 hover:text-white/70">
            Mot de passe oublié ?
          </Link>
        </div>
        <div className="relative mt-1.5">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="input pr-10"
            placeholder="••••••••"
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
        {loading ? 'Connexion…' : (
          <><span>Se connecter</span><ArrowRight className="h-4 w-4" /></>
        )}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Bon retour."
      subtitle="Connecte-toi à ton espace coiffeur."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-medium text-electric-400 hover:text-electric-300">
            Créer un compte →
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-white/[0.04]" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
