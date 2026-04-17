"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AgencyMemberRole } from "@prisma/client";
import {
  Home,
  Users,
  CalendarRange,
  Briefcase,
  MessageSquare,
  Radio,
  Settings,
  Receipt,
  FilePenLine,
  ShieldCheck,
  Sparkles,
  BarChart3,
  CreditCard,
  History,
  Banknote,
  Trash2,
  FileText,
  Building2,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can, type Action } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
  /** If set, only roles able to do this action see the link. */
  gate?: Action;
  exact?: boolean;
};

const items: NavItem[] = [
  { href: "/agency", label: "Home", icon: Home, exact: true },
  { href: "/agency/roster", label: "Roster", icon: Users },
  { href: "/agency/board", label: "Board", icon: CalendarRange },
  { href: "/agency/jobs", label: "Jobs", icon: Briefcase },
  { href: "/agency/messages", label: "Messages", icon: MessageSquare },
  { href: "/agency/broadcasts", label: "Broadcasts", icon: Radio, gate: "broadcast.send" },
  { href: "/agency/pitch", label: "Pitch deck", icon: FileText },
  { href: "/agency/invoices", label: "Invoices", icon: Receipt, gate: "invoice.create" },
  { href: "/agency/payouts", label: "Payouts", icon: Banknote, gate: "payout.mark_paid" },
  { href: "/agency/contracts", label: "Contracts", icon: FilePenLine, gate: "contract.create" },
  { href: "/agency/compliance", label: "Compliance", icon: ShieldCheck, gate: "compliance.view" },
  { href: "/agency/prospects", label: "Scouting", icon: Sparkles, gate: "prospect.edit" },
  { href: "/agency/castings", label: "Castings", icon: CalendarCheck, gate: "prospect.edit" },
  { href: "/agency/clients", label: "Clients", icon: Building2 },
  { href: "/agency/analytics", label: "Analytics", icon: BarChart3, gate: "analytics.view" },
  { href: "/agency/activity", label: "Activity", icon: History, gate: "activity.view" },
  { href: "/agency/trash", label: "Trash", icon: Trash2, gate: "job.delete" },
  { href: "/agency/billing", label: "Billing", icon: CreditCard, gate: "agency.billing" },
  { href: "/agency/settings", label: "Settings", icon: Settings },
];

export function AgencyNav({ role }: { role?: AgencyMemberRole | null }) {
  const pathname = usePathname();
  const visible = items.filter((i) => !i.gate || can(role ?? null, i.gate));

  return (
    <nav className="px-2 flex-1 overflow-y-auto">
      <ul className="space-y-0.5">
        {visible.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
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
