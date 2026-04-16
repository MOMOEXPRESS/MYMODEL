"use client";

import { InvoiceStatus } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { setInvoiceStatus, deleteInvoice } from "../actions";

export function InvoiceStatusControl({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const [pending, startTransition] = useTransition();
  function change(next: InvoiceStatus) {
    const fd = new FormData();
    fd.set("invoiceId", invoiceId);
    fd.set("status", next);
    startTransition(async () => {
      await setInvoiceStatus(fd);
    });
  }
  function destroy() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("invoiceId", invoiceId);
    startTransition(async () => {
      await deleteInvoice(fd);
    });
  }

  return (
    <>
      <select
        value={status}
        disabled={pending}
        onChange={(e) => change(e.target.value as InvoiceStatus)}
        className="ll-input w-auto text-xs"
      >
        <option value="DRAFT">Draft</option>
        <option value="SENT">Sent</option>
        <option value="PAID">Paid</option>
        <option value="OVERDUE">Overdue</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <button onClick={destroy} disabled={pending} className="ll-btn-ghost text-xs text-red-600">
        <Trash2 size={13} />
      </button>
    </>
  );
}
