import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
  /** Affiche un encart entête + actions. */
  withToolbar?: boolean;
}

/** Skeleton table responsive, à utiliser pendant le chargement des listes. */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  className,
  withToolbar = true,
}: SkeletonTableProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card shadow-sm overflow-hidden animate-fade-in",
        className,
      )}
      aria-hidden
    >
      {withToolbar && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      )}

      {/* Mobile: liste verticale ; Desktop: grille tableau */}
      <div className="divide-y">
        {/* header desktop */}
        <div
          className="hidden md:grid gap-4 px-4 py-3 bg-muted/40"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`h-${i}`} className="h-3 w-3/4" />
          ))}
        </div>

        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="px-4 py-3 grid gap-3 md:gap-4 grid-cols-2"
            style={{
              gridTemplateColumns:
                typeof window !== "undefined" && window.innerWidth >= 768
                  ? `repeat(${columns}, minmax(0, 1fr))`
                  : undefined,
            }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={`r-${r}-c-${c}`}
                className={cn("h-4", c === 0 ? "w-5/6" : "w-2/3")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SkeletonTable;
