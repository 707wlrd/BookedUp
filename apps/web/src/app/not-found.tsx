import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[rgb(5,6,8)] flex flex-col items-center justify-center px-6 text-center">
      {/* Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[400px] w-[400px] rounded-full bg-[#7C3AED]/10 blur-[120px]" />
      </div>

      {/* 404 number */}
      <p className="relative text-[9rem] font-black leading-none tracking-tighter text-white/[0.06] select-none">
        404
      </p>

      {/* Icon */}
      <div className="relative -mt-12 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-[#7C3AED]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
          />
        </svg>
      </div>

      <h1 className="relative text-2xl font-bold text-white">Page introuvable</h1>
      <p className="relative mt-2 text-sm text-white/50 max-w-xs">
        Cette page n&apos;existe pas ou a été déplacée. Pas de panique, on vous
        ramène à l&apos;accueil.
      </p>

      <div className="relative mt-8 flex gap-3">
        <Link
          href="/"
          className="btn-electric"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/barbers"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          Trouver un salon
        </Link>
      </div>
    </div>
  );
}
