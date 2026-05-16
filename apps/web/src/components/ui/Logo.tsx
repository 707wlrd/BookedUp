import Link from 'next/link';
import { Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2 font-bold tracking-tight', className)}>
      <span className="relative grid h-7 w-7 place-items-center rounded-md bg-electric-500 shadow-glow">
        <Scissors className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
      </span>
      <span>BookedUp</span>
    </Link>
  );
}
