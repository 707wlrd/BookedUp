'use client';

import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Log to an external service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('[global-error]', error.digest ?? error.message);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[rgb(5,6,8)] flex flex-col items-center justify-center px-6 text-center">
      {/* Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[400px] w-[400px] rounded-full bg-red-500/10 blur-[120px]" />
      </div>

      {/* Icon */}
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <h1 className="relative text-2xl font-bold text-white">Une erreur est survenue</h1>
      <p className="relative mt-2 text-sm text-white/50 max-w-xs">
        Quelque chose s&apos;est mal passé de notre côté. Notre équipe a été
        notifiée.
        {error.digest && (
          <span className="block mt-1 font-mono text-xs text-white/30">
            Réf : {error.digest}
          </span>
        )}
      </p>

      <div className="relative mt-8 flex gap-3">
        <button
          onClick={reset}
          className="btn-electric"
        >
          Réessayer
        </button>
        <a
          href="/"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          Retour à l&apos;accueil
        </a>
      </div>
    </div>
  );
}
