"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_NAV } from "@/lib/routing";

const items = [
  { href: PLATFORM_NAV.network, label: "Network", icon: Users },
  { href: PLATFORM_NAV.events, label: "Events", icon: CalendarDays },
];

export function PlatformNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-paper-border bg-paper/50">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle mr-2">
        Platform
      </span>
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-accent-soft text-accent"
                : "text-ink-muted hover:text-ink hover:bg-paper-hover",
            )}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
