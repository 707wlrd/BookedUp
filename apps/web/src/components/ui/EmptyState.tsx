import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-16 px-8 text-center',
        className,
      )}
    >
      {/* Icon container */}
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
        <Icon className="h-7 w-7 text-white/30" />
      </div>

      <h3 className="text-base font-semibold text-white/70">{title}</h3>

      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-white/40 leading-relaxed">{description}</p>
      )}

      {action && (
        <div className="mt-5">
          {action.href ? (
            <a href={action.href} className="btn-electric text-sm px-4 py-2">
              {action.label}
            </a>
          ) : (
            <button onClick={action.onClick} className="btn-electric text-sm px-4 py-2">
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Preset empty states ───────────────────────────────────────────────────────
import { Calendar, Star, Users, MessageSquare } from 'lucide-react';

export const EmptyAppointments = ({ onBook }: { onBook?: () => void }) => (
  <EmptyState
    icon={Calendar}
    title="Aucun rendez-vous"
    description="Vos prochains RDV apparaîtront ici dès qu'un client réserve en ligne."
    action={onBook ? { label: 'Partager mon lien', onClick: onBook } : undefined}
  />
);

export const EmptyReviews = () => (
  <EmptyState
    icon={Star}
    title="Aucun avis pour l'instant"
    description="Les avis de vos clients s'afficheront ici après chaque prestation terminée."
  />
);

export const EmptyClients = () => (
  <EmptyState
    icon={Users}
    title="Aucun client encore"
    description="Partagez votre lien de réservation pour attirer vos premiers clients."
  />
);

export const EmptyWaitlist = () => (
  <EmptyState
    icon={MessageSquare}
    title="Liste d'attente vide"
    description="Les clients qui veulent être notifiés d'un créneau libre apparaîtront ici."
  />
);
