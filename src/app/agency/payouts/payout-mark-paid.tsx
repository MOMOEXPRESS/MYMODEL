"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { markPayoutPaid } from "./actions";

export function PayoutMarkPaid({ payoutId }: { payoutId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          fd.set("payoutId", payoutId);
          await markPayoutPaid(fd);
        })
      }
    >
      <button type="submit" disabled={pending} className="ll-btn-secondary text-xs">
        <Check size={12} /> Mark paid
      </button>
    </form>
  );
}
