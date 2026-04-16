"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const KEY = "ll_cookies_v1";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* private mode */
    }
  }, []);

  function accept(value: "all" | "essential") {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[calc(100%-2rem)]">
      <div className="ll-card shadow-xl bg-paper-elevated p-4 flex items-start gap-3">
        <p className="flex-1 text-sm text-ink-muted">
          LuxLane uses cookies for authentication, language preference, and basic analytics
          to keep the app working and to make it better. See our{" "}
          <Link href="/privacy" className="underline text-ink hover:text-ink-muted">
            privacy policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => accept("essential")}
            className="ll-btn-ghost text-xs"
          >
            Essential only
          </button>
          <button
            onClick={() => accept("all")}
            className="ll-btn-primary text-xs"
          >
            Accept all
          </button>
          <button
            onClick={() => accept("essential")}
            className="ll-btn-ghost p-1.5"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
