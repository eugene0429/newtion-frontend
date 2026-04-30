import { Skeleton } from "@/components/ui/skeleton";

export function HomeSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-3 gap-5 auto-rows-min">
        <Skeleton className="h-40 col-span-2 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 col-span-2 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    </div>
  );
}
