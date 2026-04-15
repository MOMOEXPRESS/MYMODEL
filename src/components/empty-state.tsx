import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ll-card p-12 flex flex-col items-center text-center",
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="mt-4 font-medium">{title}</h3>
      {body && <p className="mt-2 text-sm text-ink-muted max-w-md">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
