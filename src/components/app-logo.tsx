import Link from "next/link";
import { cn } from "@/lib/utils";

export function AppLogo({
  href = "/",
  className,
  showWordmark = true,
}: {
  href?: string;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 group", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-paper text-xs font-semibold tracking-tight shadow-sm ring-1 ring-white/10">
        LL
      </span>
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-tight text-ink group-hover:text-white transition-colors">
          LuxLane
        </span>
      ) : null}
    </Link>
  );
}
