import { KpiCardsSkeleton, ListSkeleton } from '@/components/ui/Skeleton';

export default function StudioLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="h-9 w-64 rounded-xl bg-white/[0.06]" />

      {/* KPI cards */}
      <KpiCardsSkeleton />

      {/* Next appointment card */}
      <div className="card p-6 space-y-3">
        <div className="h-4 w-32 rounded-lg bg-white/[0.06]" />
        <div className="h-6 w-48 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-24 rounded-lg bg-white/[0.06]" />
      </div>

      {/* Recent list */}
      <ListSkeleton rows={3} />
    </div>
  );
}
