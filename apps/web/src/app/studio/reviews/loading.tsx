import { KpiCardsSkeleton, ListSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function ReviewsLoading() {
  return (
    <div className="space-y-8">
      {/* Rating hero */}
      <div className="card p-8 flex items-center gap-8">
        <Skeleton className="h-20 w-20 rounded-2xl" />
        <div className="flex-1 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-3 w-6" />
            </div>
          ))}
        </div>
      </div>

      <KpiCardsSkeleton />

      {/* Filter pills */}
      <div className="flex gap-2">
        {[5, 4, 5, 4, 4, 4].map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>

      <ListSkeleton rows={5} />
    </div>
  );
}
