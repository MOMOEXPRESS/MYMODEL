import { cn } from "@/lib/utils";

/** Elementary-style mono section marker: // OPERATIONS 01 */
export function SectionLabel({
  index,
  children,
  className,
}: {
  index: string;
  children: string;
  className?: string;
}) {
  return (
    <p className={cn("ll-index-label", className)}>
      <span className="text-editorial-warm/70">//</span> {children}{" "}
      <span className="tabular-nums text-ink-subtle">{index}</span>
    </p>
  );
}
