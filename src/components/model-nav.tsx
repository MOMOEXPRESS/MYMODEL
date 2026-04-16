"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/m", label: "Next up" },
  { href: "/m/card", label: "My card" },
  { href: "/m/earnings", label: "Earnings" },
  { href: "/m/messages", label: "Messages" },
  { href: "/m/settings", label: "Settings" },
] as const;

export function ModelNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto max-w-4xl px-6 border-t border-paper-border">
      <ul className="flex gap-6 overflow-x-auto">
        {items.map(({ href, label }) => {
          const active = pathname === href || (href !== "/m" && pathname.startsWith(href + "/"));
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "inline-block py-3 text-sm border-b-2 -mb-px transition-colors",
                  active
                    ? "border-ink text-ink font-medium"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
