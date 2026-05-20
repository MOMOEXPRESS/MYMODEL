import type { CellStatus } from "@/lib/board";
import {
  cellToSimple,
  holdDetailLabel,
  SIMPLE_STATUS_LABEL,
} from "@/lib/status-language";
import { cn } from "@/lib/utils";

export function StatusChip({
  status,
  detail,
  className,
}: {
  status: CellStatus;
  detail?: boolean;
  className?: string;
}) {
  const simple = cellToSimple(status);
  const hold = detail ? holdDetailLabel(status) : null;

  const tone =
    simple === "available"
      ? "border-paper-border bg-paper-muted text-ink-muted"
      : simple === "on_hold"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : simple === "confirmed"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : simple === "on_set"
            ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
            : "border-paper-border bg-paper-muted text-ink-muted";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        tone,
        className,
      )}
    >
      {SIMPLE_STATUS_LABEL[simple]}
      {hold ? (
        <span className="text-[10px] opacity-80 border-l border-current/20 pl-1.5">{hold}</span>
      ) : null}
    </span>
  );
}
