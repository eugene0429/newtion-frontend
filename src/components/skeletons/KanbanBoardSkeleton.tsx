import { Skeleton } from "@/components/ui/skeleton";

export function KanbanBoardSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-5">
      {[0, 1, 2].map((col) => (
        <div key={col} className="space-y-3">
          <Skeleton className="h-6 w-24" />
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-20 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
