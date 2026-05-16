import { ListSkeleton } from '@/components/ui/Skeleton';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AppointmentsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {[80, 100, 72, 90].map((w, i) => (
          <Skeleton key={i} className={`h-8 w-${w > 90 ? 24 : w > 80 ? 20 : 16} rounded-full`} />
        ))}
      </div>

      <ListSkeleton rows={7} />
    </div>
  );
}
