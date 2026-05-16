import { forwardRef, type ButtonHTMLAttributes } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'spark' | 'ghost' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-electric-500 text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset] ' +
    'hover:bg-electric-400 hover:shadow-glow hover:-translate-y-[1px] focus:ring-electric-400',
  spark:
    'bg-spark-500 text-ink-950 font-semibold shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] ' +
    'hover:bg-spark-400 hover:shadow-glow-spark hover:-translate-y-[1px] focus:ring-spark-400',
  ghost:
    'border border-white/10 bg-white/[0.04] text-white/90 ' +
    'hover:bg-white/[0.08] hover:border-white/20',
  subtle: 'text-white/70 hover:text-white hover:bg-white/[0.05]',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-sm',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', href, className, children, ...rest },
  ref,
) {
  const classes = cn(
    'group inline-flex items-center justify-center gap-2 rounded-full font-medium',
    'transition-all duration-150 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ink-950',
    'disabled:opacity-50 disabled:pointer-events-none disabled:hover:translate-y-0',
    'active:translate-y-0',
    'arrow-slide',
    variants[variant],
    sizes[size],
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} className={classes} {...rest}>
      {children}
    </button>
  );
});
