import { Skeleton } from "@/components/ui/skeleton";

export function AppBootstrapSkeleton() {
  return (
    <div className="min-h-screen flex bg-page">
      <aside className="w-60 border-r border-line p-4 space-y-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </aside>
      <main className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-3 gap-5">
          <Skeleton className="h-40 col-span-2" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40 col-span-2" />
          <Skeleton className="h-40" />
        </div>
      </main>
    </div>
  );
}
