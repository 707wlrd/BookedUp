import { cn } from '@/lib/utils';

export function StatCard({
  label, value, delta, hint, highlight, Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  highlight?: boolean;
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={cn(
        'card card-hover relative overflow-hidden p-5 transition-all',
        highlight && 'border-electric-500/30 bg-gradient-to-br from-electric-500/[0.08] to-transparent',
      )}
    >
      <div className="flex items-start justify-between">
        <span className="label">{label}</span>
        {Icon && (
          <Icon
            className={cn(
              'h-4 w-4',
              highlight ? 'text-electric-300' : 'text-white/30',
            )}
          />
        )}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta && (
          <span
            className={cn(
              'font-medium',
              delta.startsWith('-') ? 'text-danger' : 'text-electric-300',
            )}
          >
            {delta}
          </span>
        )}
        {hint && <span className="text-white/40">{hint}</span>}
      </div>
      {highlight && (
        <div className="pointer-events-none absolute inset-0 bg-glow-blue opacity-30" />
      )}
    </div>
  );
}

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/55">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
