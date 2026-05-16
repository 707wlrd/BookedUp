import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="relative grid h-7 w-7 place-items-center rounded-md bg-electric-500 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M5 12 L10 17 L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>BookedUp</span>
    </Link>
  );
}
