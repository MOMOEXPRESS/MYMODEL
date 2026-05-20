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
  CalendarDays,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can, type Action } from "@/lib/permissions";
import { PLATFORM_NAV } from "@/lib/routing";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  gate?: Action;
  exact?: boolean;
};

type NavSection = {
  label: string;
  index: string;
  items: NavItem[];
};

function sectionsForRole(role?: AgencyMemberRole | null): NavSection[] {
  if (role === "ACCOUNTS") {
    return [
      {
        label: "Finance",
        index: "01",
        items: [
          { href: "/agency/money", label: "Money", icon: Receipt, exact: true },
          { href: "/agency/invoices", label: "Invoices", icon: Receipt },
          { href: "/agency/payouts", label: "Payouts", icon: Banknote },
          { href: "/agency/contracts", label: "Contracts", icon: Receipt },
          { href: "/agency/compliance", label: "Compliance", icon: Receipt },
        ],
      },
      {
        label: "Admin",
        index: "02",
        items: [
          { href: "/rules", label: "Rules", icon: HelpCircle },
          { href: "/agency/settings", label: "Settings", icon: Settings },
        ],
      },
    ];
  }

  if (role === "PRODUCTION") {
    return [
      {
        label: "Operations",
        index: "01",
        items: [
          { href: "/agency/production", label: "Live jobs", icon: Clapperboard, exact: true },
          { href: "/agency/schedule", label: "Schedule", icon: CalendarRange },
          { href: "/agency/bookings", label: "Bookings", icon: Briefcase },
          { href: "/agency/talent", label: "Talent", icon: Users },
          { href: PLATFORM_NAV.network, label: "Network", icon: Network },
          { href: PLATFORM_NAV.events, label: "Events", icon: CalendarDays },
        ],
      },
      {
        label: "Comms",
        index: "02",
        items: [
          { href: "/agency/messages", label: "Messages", icon: MessageSquare },
          { href: "/rules", label: "Rules", icon: HelpCircle },
          { href: "/agency/settings", label: "Settings", icon: Settings },
        ],
      },
    ];
  }

  return [
    {
      label: "Operations",
      index: "01",
      items: [
        { href: "/agency/workbench", label: "Workbench", icon: LayoutDashboard, exact: true },
        { href: "/agency/schedule", label: "Schedule", icon: CalendarRange },
        { href: "/agency/bookings", label: "Bookings", icon: Briefcase },
        { href: "/agency/talent", label: "Talent", icon: Users },
        { href: PLATFORM_NAV.network, label: "Network", icon: Network },
        { href: PLATFORM_NAV.events, label: "Events", icon: CalendarDays },
      ],
    },
    {
      label: "Clients & comms",
      index: "02",
      items: [
        { href: "/agency/clients", label: "Clients", icon: Building2 },
        { href: "/agency/packages", label: "Packages", icon: Package, gate: "package.create" },
        { href: "/agency/messages", label: "Messages", icon: MessageSquare, gate: "message.send" },
        { href: "/agency/broadcasts", label: "Casting blasts", icon: Radio, gate: "broadcast.send" },
      ],
    },
    {
      label: "Scouting",
      index: "03",
      items: [
        { href: "/agency/prospects", label: "New faces", icon: Sparkles, gate: "prospect.edit" },
      ],
    },
    {
      label: "Admin",
      index: "04",
      items: [
        { href: "/agency/invoices", label: "Invoices", icon: Receipt, gate: "invoice.create" },
        { href: "/rules", label: "Rules", icon: HelpCircle },
        { href: "/agency/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

export function AgencyNav({ role }: { role?: AgencyMemberRole | null }) {
  const pathname = usePathname();
  const sections = sectionsForRole(role);

  return (
    <nav className="flex-1 overflow-y-auto px-2 pb-4">
      {sections.map((section) => {
        const items = section.items.filter((i) => !i.gate || can(role ?? null, i.gate));
        if (items.length === 0) return null;
        return (
          <div key={section.label} className="mb-1">
            <p className="ll-nav-section">
              <span className="text-editorial-warm/60">//</span> {section.label}{" "}
              <span className="tabular-nums">{section.index}</span>
            </p>
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
                      <Icon size={17} strokeWidth={active ? 2 : 1.75} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
