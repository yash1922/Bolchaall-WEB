import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-gradient-to-r from-ink-100 via-ink-200 to-ink-100 bg-[length:200%_100%] animate-shimmer",
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card-base rounded-2xl p-6 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card-base rounded-2xl p-6 flex flex-col gap-3">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-60" />
      <div className="flex flex-col gap-2 mt-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
