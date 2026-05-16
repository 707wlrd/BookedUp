import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-52 rounded-xl" />
      </div>
      <ListSkeleton rows={8} />
    </div>
  );
}
