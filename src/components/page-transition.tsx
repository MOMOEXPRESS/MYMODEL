"use client";

// Client wrapper that fades + lifts page content on route change.
// Re-keys on pathname so React re-mounts children and CSS animations
// fire cleanly. Works across all Next.js App Router navigation.

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
