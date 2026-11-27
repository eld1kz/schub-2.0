// A block standing in for something still loading (DESIGN.md). Size it with `className`.
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`skeleton block rounded-sm ${className}`} />;
}

// A page while it loads: its title, then rows. `title` off under a layout that already shows one.
export function PageSkeleton({ title = true, rows = 5 }: { title?: boolean; rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex max-w-column flex-col">
      {title && (
        <div className="flex flex-col gap-3 pb-8">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      )}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 border-b border-border py-4">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}
