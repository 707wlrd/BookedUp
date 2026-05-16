'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function Nav() {
  const scrolled = useScrolled();
  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-200',
        scrolled
          ? 'border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <Link href="/barbers"            className="transition hover:text-white">Barbers</Link>
          <Link href="/#comment-ca-marche" className="transition hover:text-white">Comment ça marche</Link>
          <Link href="/#avis"              className="transition hover:text-white">Avis</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/pro"
            className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:border-electric-500/40 hover:text-white sm:inline-flex"
          >
            <Briefcase className="h-3.5 w-3.5" />
            Pour les barbers
          </Link>
          <Button href="/login" variant="subtle" size="sm">Connexion</Button>
          <Button href="/barbers" size="sm">Réserver</Button>
        </div>
      </div>
    </header>
  );
}

export function ProNav() {
  const scrolled = useScrolled();
  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-200',
        scrolled
          ? 'border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/pro" className="flex items-center gap-2">
          <Logo />
          <span className="hidden rounded-full border border-electric-500/30 bg-electric-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-electric-200 sm:inline">
            Pro
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <Link href="/pro#features" className="transition hover:text-white">Fonctionnalités</Link>
          <Link href="/pro/pricing"  className="transition hover:text-white">Tarifs</Link>
          <Link href="/pro#faq"      className="transition hover:text-white">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/" className="hidden text-xs text-white/50 transition hover:text-white sm:inline">
            ← Côté client
          </Link>
          <Button href="/login" variant="subtle" size="sm">Connexion</Button>
          <Button href="/register?role=barber" size="sm">Commencer</Button>
        </div>
      </div>
    </header>
  );
}

function useScrolled(threshold = 10) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}
