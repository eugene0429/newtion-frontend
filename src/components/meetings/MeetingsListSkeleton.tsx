export function MeetingsListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-card bg-card border border-line p-4 h-32 animate-pulse"
        >
          <div className="h-3 w-16 bg-muted rounded mb-3" />
          <div className="h-4 w-3/4 bg-muted rounded mb-2" />
          <div className="h-3 w-full bg-muted rounded mb-1" />
          <div className="h-3 w-2/3 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
