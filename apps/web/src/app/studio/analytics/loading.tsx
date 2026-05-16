import { KpiCardsSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-9 w-48" />

      {/* Period tabs */}
      <div className="flex gap-2">
        {[3, 3, 3].map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-xl" />
        ))}
      </div>

      <KpiCardsSkeleton />

      {/* Chart placeholder */}
      <div className="card p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>

      {/* Two col */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-6 space-y-3">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
        <div className="card p-6 space-y-3">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
