"use client";

import { Undo2, Trash2 } from "lucide-react";
import { useTransition } from "react";
import {
  restoreJob,
  purgeJob,
  restoreInvoice,
  purgeInvoice,
  restoreContract,
  purgeContract,
} from "./actions";

type Kind = "job" | "invoice" | "contract";

export function TrashRowActions({ kind, id }: { kind: Kind; id: string }) {
  const [pending, startTransition] = useTransition();

  const restoreFn = kind === "job" ? restoreJob : kind === "invoice" ? restoreInvoice : restoreContract;
  const purgeFn = kind === "job" ? purgeJob : kind === "invoice" ? purgeInvoice : purgeContract;
  const paramKey = `${kind}Id`;

  function restore() {
    const fd = new FormData();
    fd.set(paramKey, id);
    startTransition(async () => {
      await restoreFn(fd);
    });
  }

  function purge() {
    if (!confirm("Permanently delete? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set(paramKey, id);
    startTransition(async () => {
      await purgeFn(fd);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={restore} disabled={pending} className="ll-btn-secondary text-xs">
        <Undo2 size={12} /> Restore
      </button>
      <button
        onClick={purge}
        disabled={pending}
        className="ll-btn-ghost text-xs text-red-600"
        title="Delete permanently"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
