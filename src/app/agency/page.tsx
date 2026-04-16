import Link from "next/link";
import { Copy, CalendarRange, Users, Briefcase, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";
import { OnboardingBanner } from "./onboarding-banner";

export default async function AgencyHome() {
  const user = await requireAgencyStaff();

  const [modelCount, activeCount, jobCount, openJobCount, unreadMessages, pendingBroadcastResponses] =
    await Promise.all([
      prisma.model.count({ where: { agencyId: user.agencyId } }),
      prisma.model.count({ where: { agencyId: user.agencyId, status: "ACTIVE" } }),
      prisma.job.count({ where: { agencyId: user.agencyId } }),
      prisma.job.count({
        where: { agencyId: user.agencyId, status: { in: ["OPEN", "CONFIRMED", "IN_PROGRESS"] } },
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false, type: "MESSAGE" },
      }),
      prisma.broadcastResponse.count({
        where: {
          broadcast: { agencyId: user.agencyId },
          response: "NO_RESPONSE",
        },
      }),
    ]);

  const isFresh = modelCount === 0 && jobCount === 0;

  return (
    <div>
      <PageHeader
        title={`Good morning, ${user.displayName.split(" ")[0]}`}
        subtitle={`${user.agency.name}${user.agency.city ? ` · ${user.agency.city}` : ""}`}
      />
      <div className="px-8 pb-12">
        {isFresh && (
          <OnboardingBanner
            agencyCode={user.agency.signupCode}
            agencyName={user.agency.name}
          />
        )}

        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${isFresh ? "mt-8" : ""}`}>
          <Stat
            label="Models on roster"
            value={modelCount}
            sub={`${activeCount} active`}
            icon={<Users size={14} />}
            href="/agency/roster"
          />
          <Stat
            label="Open jobs"
            value={openJobCount}
            sub={`${jobCount} total`}
            icon={<Briefcase size={14} />}
            href="/agency/jobs"
          />
          <Stat
            label="Unread messages"
            value={unreadMessages}
            sub="Your inbox"
            icon={<MessageSquare size={14} />}
            href="/agency/messages"
          />
          <Stat
            label="Waiting replies"
            value={pendingBroadcastResponses}
            sub="Across broadcasts"
            icon={<CalendarRange size={14} />}
            href="/agency/broadcasts"
          />
        </div>

        <section className="mt-8 ll-card p-6">
          <h3 className="font-medium">Quick actions</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/agency/roster" className="ll-btn-secondary">
              <Users size={14} /> Roster
            </Link>
            <Link href="/agency/board" className="ll-btn-secondary">
              <CalendarRange size={14} /> Board
            </Link>
            <Link href="/agency/jobs/new" className="ll-btn-primary">
              <Briefcase size={14} /> New job
            </Link>
            <Link href="/agency/broadcasts" className="ll-btn-secondary">
              <MessageSquare size={14} /> Send a broadcast
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  icon?: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className="ll-card p-5 hover:border-ink-subtle transition-colors block">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-subtle">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-serif text-3xl tracking-tight">{value}</div>
      {sub && <div className="text-xs text-ink-subtle mt-0.5">{sub}</div>}
    </Link>
  );
}
