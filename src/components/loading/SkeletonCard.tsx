import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  lines?: number;
  showAvatar?: boolean;
}

/** Skeleton réutilisable pour cartes/tuiles. */
export function SkeletonCard({
  className,
  lines = 3,
  showAvatar = false,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm animate-fade-in",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center gap-3">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3"
            style={{ width: `${90 - i * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default SkeletonCard;
