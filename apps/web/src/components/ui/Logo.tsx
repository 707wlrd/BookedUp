import Link from 'next/link';
import { cn } from '@/lib/utils';

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
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
      </defs>

      {/* Fond */}
      <rect width="30" height="30" rx="8" fill="url(#bu-bg)" />

      {/* Lettre B */}
      <text
        x="15"
        y="21.5"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="19"
        fill="white"
      >
        B
      </text>
    </svg>
  );
}

export function Logo({ className, iconSize = 30 }: { className?: string; iconSize?: number }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5', className)}>
      <BookedUpMark size={iconSize} />
      <span
        className="text-[17px] font-bold leading-none tracking-tight text-white"
      >
        Booked<span
          style={{
            background: 'linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >Up</span>
      </span>
    </Link>
  );
}

export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex', className)}>
      <BookedUpMark size={size} />
    </span>
  );
}
