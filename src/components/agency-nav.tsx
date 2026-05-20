"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AgencyMemberRole } from "@prisma/client";
import {
  LayoutDashboard,
  CalendarRange,
  Briefcase,
  Users,
  Building2,
  MessageSquare,
  Radio,
  Receipt,
  Settings,
  Sparkles,
  Banknote,
  Clapperboard,
  Package,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can, type Action } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  gate?: Action;
  exact?: boolean;
};

function navForRole(role?: AgencyMemberRole | null): NavItem[] {
  if (role === "ACCOUNTS") {
    return [
      { href: "/agency/money", label: "Money", icon: Receipt, exact: true },
      { href: "/agency/invoices", label: "Invoices", icon: Receipt },
      { href: "/agency/payouts", label: "Payouts", icon: Banknote },
      { href: "/agency/contracts", label: "Contracts", icon: Receipt },
      { href: "/agency/compliance", label: "Compliance", icon: Receipt },
      { href: "/rules", label: "Rules", icon: HelpCircle },
      { href: "/agency/settings", label: "Settings", icon: Settings },
    ];
  }
  if (role === "PRODUCTION") {
    return [
      { href: "/agency/production", label: "Live jobs", icon: Clapperboard, exact: true },
      { href: "/agency/schedule", label: "Schedule", icon: CalendarRange },
      { href: "/agency/bookings", label: "Bookings", icon: Briefcase },
      { href: "/agency/talent", label: "Talent", icon: Users },
      { href: "/agency/messages", label: "Messages", icon: MessageSquare },
      { href: "/rules", label: "Rules", icon: HelpCircle },
      { href: "/agency/settings", label: "Settings", icon: Settings },
    ];
  }
  return [
    { href: "/agency/workbench", label: "Workbench", icon: LayoutDashboard, exact: true },
    { href: "/agency/schedule", label: "Schedule", icon: CalendarRange },
    { href: "/agency/bookings", label: "Bookings", icon: Briefcase },
    { href: "/agency/talent", label: "Talent", icon: Users },
    { href: "/agency/clients", label: "Clients", icon: Building2 },
    { href: "/agency/packages", label: "Packages", icon: Package, gate: "package.create" },
    { href: "/agency/messages", label: "Messages", icon: MessageSquare, gate: "message.send" },
    { href: "/agency/broadcasts", label: "Casting blasts", icon: Radio, gate: "broadcast.send" },
    { href: "/agency/prospects", label: "New faces", icon: Sparkles, gate: "prospect.edit" },
    { href: "/agency/invoices", label: "Invoices", icon: Receipt, gate: "invoice.create" },
    { href: "/rules", label: "Rules", icon: HelpCircle },
    { href: "/agency/settings", label: "Settings", icon: Settings },
  ];
}

export function AgencyNav({ role }: { role?: AgencyMemberRole | null }) {
  const pathname = usePathname();
  const items = navForRole(role).filter((i) => !i.gate || can(role ?? null, i.gate));

  return (
    <nav className="flex-1 overflow-y-auto px-2 pb-4">
      <ul className="space-y-0.5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn("ll-nav-link", active && "ll-nav-link-active")}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
