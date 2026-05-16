import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
        <div className="col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-white/40">
            Stay Booked. Trouve ton coiffeur et réserve en 30 secondes.
          </p>
          <Link
            href="/pro"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:border-electric-500/40 hover:text-white"
          >
            <Briefcase className="h-3.5 w-3.5" /> Pour les coiffeurs
          </Link>
        </div>
        <FooterCol
          title="Découvrir"
          links={[
            ['Tous les coiffeurs', '/barbers'],
            ['Paris', '/barbers?q=Paris'],
            ['Lyon', '/barbers?q=Lyon'],
            ['Marseille', '/barbers?q=Marseille'],
          ]}
        />
        <FooterCol
          title="BookedUp"
          links={[
            ['Pour les coiffeurs', '/pro'],
            ['Tarifs Pro', '/pro/pricing'],
            ['Connexion', '/login'],
            ['Contact', 'mailto:hello@bookedup.app'],
          ]}
        />
      </div>
      <div className="mx-auto mt-12 max-w-7xl px-6 text-xs text-white/30">
        © {new Date().getFullYear()} BookedUp. All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="label">{title}</div>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-white/60 hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
