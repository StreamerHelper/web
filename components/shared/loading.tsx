import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card">
      <Skeleton className="h-10 w-full rounded-none" />
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-2 h-8 w-1/2" />
    </div>
  );
}
