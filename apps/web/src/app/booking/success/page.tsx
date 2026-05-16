import Link from 'next/link';
import { CheckCircle2, CalendarDays, ArrowRight } from 'lucide-react';
import { Nav } from '@/components/marketing/Nav';

export default function BookingSuccessPage() {
  return (
    <>
      <Nav />
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-electric-500/15 shadow-glow">
            <CheckCircle2 className="h-10 w-10 text-electric-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Réservation confirmée !</h1>
          <p className="mt-3 text-white/55">
            Tu recevras un email de confirmation avec tous les détails de ton rendez-vous.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/barbers"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.08]"
            >
              <CalendarDays className="h-4 w-4" />
              Explorer d'autres barbers
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-electric-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-electric-400"
            >
              Retour à l'accueil <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
