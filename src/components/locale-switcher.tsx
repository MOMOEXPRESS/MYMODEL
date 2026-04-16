"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LocaleSwitcher({ current }: { current: "en" | "fr" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(locale: "en" | "fr") {
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-0.5 text-[11px]">
      {(["en", "fr"] as const).map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          disabled={pending}
          className={
            current === l
              ? "px-2 py-1 rounded-md bg-ink text-paper uppercase"
              : "px-2 py-1 rounded-md text-ink-muted hover:text-ink uppercase"
          }
          aria-pressed={current === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
