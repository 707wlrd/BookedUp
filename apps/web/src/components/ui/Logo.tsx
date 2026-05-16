import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ── SVG Mark : calendrier + éclair ── */
function BookedUpMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="bu-bg" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id="bu-bolt" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>

      {/* Fond carré arrondi */}
      <rect width="30" height="30" rx="8" fill="url(#bu-bg)" />

      {/* Calendrier — contour */}
      <rect x="5" y="8.5" width="20" height="16" rx="2.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" />

      {/* Barre header du calendrier */}
      <rect x="5" y="8.5" width="20" height="5.5" rx="2.5" fill="rgba(255,255,255,0.18)" />
      {/* Correction coins bas de la barre header */}
      <rect x="5" y="11.5" width="20" height="2.5" fill="rgba(255,255,255,0.18)" />

      {/* Anneau gauche */}
      <rect x="9.5" y="5.5" width="2.2" height="6" rx="1.1" fill="white" />
      {/* Anneau droit */}
      <rect x="18.3" y="5.5" width="2.2" height="6" rx="1.1" fill="white" />

      {/* Éclair centré dans le corps du calendrier */}
      {/* Viewbox corps : x 5-25, y 14-24.5 → centre x=15, y=19 */}
      <path
        d="M16.5 14.5 L11.5 20 L14.8 20 L13.5 25.5 L19 19.5 L15.5 19.5 Z"
        fill="url(#bu-bolt)"
      />
    </svg>
  );
}

/* ── Wordmark ── */
function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-bold leading-none tracking-tight', className)}>
      <span className="text-white">Booked</span>
      <span
        style={{
          background: 'linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Up
      </span>
    </span>
  );
}

/* ── Logo principal ── */
export function Logo({ className, iconSize = 30 }: { className?: string; iconSize?: number }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5', className)}>
      <BookedUpMark size={iconSize} />
      <Wordmark className="text-[17px]" />
    </Link>
  );
}

/* ── Mark seul (favicon / splash) ── */
export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex', className)}>
      <BookedUpMark size={size} />
    </span>
  );
}
