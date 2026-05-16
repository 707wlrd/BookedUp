import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-grid-faint" />
      <div className="absolute inset-x-0 top-0 h-[420px] bg-glow-blue opacity-60" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6">
        <div className="pt-8">
          <Logo />
        </div>
        <div className="flex-1 flex flex-col justify-center py-12">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-white/55">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-white/50">{footer}</div>}
        </div>
        <div className="pb-8 text-center text-xs text-white/30">
          <Link href="/" className="hover:text-white/60">← retour à l’accueil</Link>
        </div>
      </div>
    </div>
  );
}
