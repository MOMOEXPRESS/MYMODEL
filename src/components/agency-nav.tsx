"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, CalendarRange, Briefcase, MessageSquare, Radio, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/agency/roster", label: "Roster", icon: Users },
  { href: "/agency/board", label: "Board", icon: CalendarRange },
  { href: "/agency/jobs", label: "Jobs", icon: Briefcase },
  { href: "/agency/messages", label: "Messages", icon: MessageSquare },
  { href: "/agency/broadcasts", label: "Broadcasts", icon: Radio },
  { href: "/agency/settings", label: "Settings", icon: Settings },
] as const;

export function AgencyNav() {
  const pathname = usePathname();

  return (
    <nav className="px-2 flex-1">
      <ul className="space-y-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-ink text-paper"
                    : "text-ink-muted hover:text-ink hover:bg-paper-border/40",
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
