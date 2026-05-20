"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Calendar, Home, Image, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  exact?: boolean;
};

const items: NavItem[] = [
  { href: "/m", label: "Home", icon: Home, exact: true },
  { href: "/m/availability", label: "Schedule", icon: Calendar },
  { href: "/m/bookings", label: "Bookings", icon: Briefcase },
  { href: "/m/card", label: "Portfolio", icon: Image },
  { href: "/m/messages", label: "Messages", icon: MessageSquare },
  { href: "/m/settings", label: "Profile", icon: Settings },
];

export function ModelNav() {
  const pathname = usePathname();

  return (
    <nav className="border-t border-paper-border bg-paper-elevated">
      <ul className="mx-auto max-w-3xl px-4 flex gap-1 overflow-x-auto">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active =
            pathname === href || (!exact && href !== "/m" && pathname.startsWith(href + "/"));
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                  active
                    ? "border-accent text-ink"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
