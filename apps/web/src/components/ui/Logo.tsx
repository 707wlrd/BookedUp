import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ── SVG icon mark ── */
function BookedUpMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="bu-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <filter id="bu-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background rounded square */}
      <rect width="28" height="28" rx="7" fill="url(#bu-grad)" />

      {/* Scissors SVG — custom, tight, centered */}
      <g filter="url(#bu-glow)" transform="translate(5, 5)">
        {/* Top blade */}
        <path
          d="M2.5 2.5 C2.5 2.5 10 7 10 9"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Bottom blade */}
        <path
          d="M2.5 15.5 C2.5 15.5 10 11 10 9"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Top handle circle */}
        <circle cx="2.5" cy="2.5" r="2" stroke="white" strokeWidth="1.5" fill="none" />
        {/* Bottom handle circle */}
        <circle cx="2.5" cy="15.5" r="2" stroke="white" strokeWidth="1.5" fill="none" />
        {/* Cross point dot */}
        <circle cx="10" cy="9" r="1" fill="white" />
        {/* Extension line (tail of scissors) */}
        <path
          d="M10 9 L16 6.5"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="1.5 1.5"
        />
        <path
          d="M10 9 L16 11.5"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="1.5 1.5"
        />
      </g>
    </svg>
  );
}

/* ── Wordmark ── */
function BookedUpWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-bold tracking-tight', className)}>
      <span className="text-white">Booked</span>
      <span
        style={{
          background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
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

/* ── Logo (icon + wordmark) ── */
export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2', className)}>
      <BookedUpMark size={size} />
      <BookedUpWordmark className="text-[17px] leading-none" />
    </Link>
  );
}

/* ── Mark only (icon seul, pour favicon / splash) ── */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex', className)}>
      <BookedUpMark size={size} />
    </span>
  );
}
