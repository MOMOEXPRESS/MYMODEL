import { cn } from "@/lib/utils";

/**
 * Shimmer skeleton. Use for pending-state placeholders — one <Skeleton /> per
 * eventual element. Widths/heights are set by parent or passed via className.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-paper-border/30 animate-shimmer",
        className,
      )}
    />
  );
}

/** Pre-composed block: a card with title + body skeleton. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="ll-card p-5">
      <Skeleton className="h-4 w-24" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3" />
        ))}
      </div>
    </div>
  );
}
