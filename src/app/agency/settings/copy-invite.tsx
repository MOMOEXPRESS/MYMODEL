"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyInviteClient({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const link = `${origin}/signup/model?code=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <button onClick={copy} className="mt-3 ll-btn-secondary text-xs w-full">
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Link copied" : "Copy invite link"}
    </button>
  );
}
