import Link from "next/link";
import {
  Briefcase,
  Users,
  CalendarRange,
  MessageSquare,
  Receipt,
  Radio,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Plus,
  History,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";
import { OnboardingBanner } from "./onboarding-banner";
import { initials, cn } from "@/lib/utils";

export default async function AgencyHome() {
  const user = await requireAgencyStaff();
  const today = new Date();
  const today0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const in7 = new Date(today0.getTime() + 7 * 86400 * 1000);
  const in90 = new Date(today0.getTime() + 90 * 86400 * 1000);

  const [
    modelCount,
    activeCount,
    jobCount,
    openJobCount,
    overdueInvoices,
    expiringDocs,
    pendingBroadcastReplies,
    unreadMessages,
    recentActivity,
    recentNotifications,
    upcomingJobs,
    atRiskJobs,
    recentlyConfirmed,
    paidInvoices6mo,
    completedJobs6mo,
    clientJobs,
  ] = await Promise.all([
    prisma.model.count({ where: { agencyId: user.agencyId } }),
    prisma.model.count({ where: { agencyId: user.agencyId, status: "ACTIVE" } }),
    prisma.job.count({ where: { agencyId: user.agencyId, deletedAt: null } }),
    prisma.job.count({
      where: {
        agencyId: user.agencyId,
        deletedAt: null,
        status: { in: ["OPEN", "CONFIRMED", "IN_PROGRESS"] },
      },
    }),
    prisma.invoice.count({
      where: { agencyId: user.agencyId, status: "OVERDUE", deletedAt: null },
    }),
    prisma.modelDocument.count({
      where: { model: { agencyId: user.agencyId }, expiresAt: { lte: in90, gte: today0 } },
    }),
    prisma.broadcastResponse.count({
      where: { broadcast: { agencyId: user.agencyId }, response: "NO_RESPONSE" },
    }),
    prisma.notification.count({
      where: { userId: user.id, read: false, type: "MESSAGE" },
    }),
    prisma.auditEvent.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.job.findMany({
      where: {
        agencyId: user.agencyId,
        deletedAt: null,
        startDate: { gte: today0, lte: in7 },
      },
      include: {
        _count: { select: { assignments: { where: { status: "CONFIRMED" } } } },
      },
      orderBy: { startDate: "asc" },
      take: 6,
    }),
    prisma.job.findMany({
      where: {
        agencyId: user.agencyId,
        deletedAt: null,
        status: { in: ["OPEN", "CONFIRMED"] },
        startDate: { gte: today0, lte: in7 },
        assignments: { none: { status: "CONFIRMED" } },
      },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
    prisma.jobAssignment.findMany({
      where: {
        job: { agencyId: user.agencyId, deletedAt: null },
        status: "CONFIRMED",
        confirmedAt: { gte: new Date(Date.now() - 7 * 86400 * 1000) },
      },
      include: {
        model: { include: { user: { select: { displayName: true } } } },
        job: { select: { id: true, title: true } },
      },
      orderBy: { confirmedAt: "desc" },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        agencyId: user.agencyId,
        status: "PAID",
        paidAt: { gte: new Date(today0.getTime() - 180 * 86400 * 1000) },
      },
      select: { total: true, paidAt: true, currency: true },
    }),
    prisma.jobAssignment.count({
      where: {
        status: "DONE",
        job: {
          agencyId: user.agencyId,
          deletedAt: null,
          endDate: { gte: new Date(today0.getTime() - 30 * 86400 * 1000) },
        },
      },
    }),
    // Rebook candidates: clients who've had ≥2 jobs with us and haven't
    // booked anything in the last 120 days. Gives the booker a reminder to
    // reach out. We pull jobs + client joined and group in memory.
    prisma.job.findMany({
      where: {
        agencyId: user.agencyId,
        deletedAt: null,
        clientId: { not: null },
        status: { in: ["DONE", "CONFIRMED", "IN_PROGRESS"] },
      },
      select: {
        id: true,
        title: true,
        clientId: true,
        endDate: true,
        client: { select: { id: true, name: true, companyName: true } },
      },
      orderBy: { endDate: "desc" },
      take: 200,
    }),
  ]);

  // Build the 6-month revenue series for the mini-chart.
  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(today0);
    d.setUTCMonth(d.getUTCMonth() - (5 - i));
    return {
      key: d.getUTCFullYear() * 100 + d.getUTCMonth(),
      label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      amount: 0,
    };
  });
  for (const i of paidInvoices6mo) {
    if (!i.paidAt) continue;
    const k = i.paidAt.getUTCFullYear() * 100 + i.paidAt.getUTCMonth();
    const m = months.find((m) => m.key === k);
    if (m) m.amount += i.total;
  }
  const revenue6mo = months.reduce((s, m) => s + m.amount, 0);
  const maxMonth = Math.max(1, ...months.map((m) => m.amount));

  // Rebook suggestions: group jobs by client, count + last-touch date. Clients
  // with ≥2 jobs and > 120d since their last wrap are our candidates.
  const byClient = new Map<
    string,
    { clientId: string; name: string; companyName: string | null; count: number; lastEnd: Date }
  >();
  for (const j of clientJobs) {
    if (!j.client) continue;
    const k = j.client.id;
    const existing = byClient.get(k);
    if (existing) {
      existing.count += 1;
      if (j.endDate > existing.lastEnd) existing.lastEnd = j.endDate;
    } else {
      byClient.set(k, {
        clientId: j.client.id,
        name: j.client.name,
        companyName: j.client.companyName,
        count: 1,
        lastEnd: j.endDate,
      });
    }
  }
  const rebookCandidates = Array.from(byClient.values())
    .filter((c) => c.count >= 2 && Date.now() - c.lastEnd.getTime() > 120 * 86400 * 1000)
    .sort((a, b) => a.lastEnd.getTime() - b.lastEnd.getTime())
    .slice(0, 5);

  const isFresh = modelCount === 0 && jobCount === 0;
  const greeting = greet(today.getHours());
  const firstName = user.displayName.split(" ")[0];

  return (
    <div>
      <PageHeader
        eyebrow={`${user.agency.name}${user.agency.city ? ` · ${user.agency.city}` : ""}`}
        title={`${greeting}, ${firstName}.`}
        subtitle={today.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        stats={[
          { label: "Models", value: modelCount },
          { label: "Open jobs", value: openJobCount },
          { label: "Overdue", value: overdueInvoices },
          { label: "Expiring docs", value: expiringDocs },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/agency/jobs/new" className="ll-btn-primary">
              <Plus size={14} /> New job
            </Link>
            <Link href="/agency/broadcasts" className="ll-btn-secondary">
              <Radio size={14} /> Broadcast
            </Link>
          </div>
        }
      />

      <div className="px-8 pb-12 grid gap-6 lg:grid-cols-3">
        {isFresh && (
          <div className="lg:col-span-3 mt-6">
            <OnboardingBanner
              agencyCode={user.agency.signupCode}
              agencyName={user.agency.name}
            />
          </div>
        )}

        <section className="lg:col-span-2 space-y-6 mt-6">
          <Card
            title="Revenue"
            link="/agency/analytics"
            icon={<TrendingUp size={14} />}
          >
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="font-serif text-3xl tracking-tight">
                  {user.agency.currency} {revenue6mo.toFixed(0)}
                </div>
                <div className="text-[11px] text-ink-subtle mt-0.5">
                  Paid last 6 months · {completedJobs6mo} jobs done last 30d
                </div>
              </div>
            </div>
            <div className="flex items-end gap-2 h-24">
              {months.map((m) => {
                const h = Math.max(2, Math.round((m.amount / maxMonth) * 100));
                return (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative flex-1 flex items-end">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-ink to-ink-muted transition-all"
                        style={{ height: `${h}%` }}
                        title={`${m.label} · ${user.agency.currency} ${m.amount.toFixed(0)}`}
                      />
                    </div>
                    <div className="text-[10px] text-ink-subtle">{m.label}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Recent activity" link="/agency/activity" icon={<History size={14} />}>
            {recentActivity.length === 0 ? (
              <Empty body="As your team works on jobs, edits, and confirms models, you'll see it stream here." />
            ) : (
              <ul className="divide-y divide-paper-border">
                {recentActivity.map((e) => (
                  <li key={e.id} className="py-2.5 flex items-start gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-accent-soft text-accent text-[10px] font-medium flex items-center justify-center shrink-0">
                      {initials(e.actorName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        <span className="font-medium">{e.actorName}</span>
                        <span className="text-ink-muted"> · {e.summary}</span>
                      </div>
                      <div className="text-[10px] text-ink-subtle mt-0.5">
                        {timeAgo(e.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card
              title="Upcoming this week"
              link="/agency/board"
              icon={<CalendarRange size={14} />}
            >
              {upcomingJobs.length === 0 ? (
                <Empty body="No jobs in the next seven days." />
              ) : (
                <ul className="divide-y divide-paper-border">
                  {upcomingJobs.map((j) => (
                    <li key={j.id} className="py-2.5 text-sm">
                      <Link href={`/agency/jobs/${j.id}`} className="block hover:text-ink-muted">
                        <div className="font-medium truncate">{j.title}</div>
                        <div className="text-xs text-ink-muted mt-0.5">
                          {fmtDate(j.startDate)}
                          {j.locationCity ? ` · ${j.locationCity}` : ""}
                          {" · "}
                          {j._count.assignments} confirmed
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title="At risk"
              link="/agency/jobs"
              icon={<AlertTriangle size={14} className="text-board-option1" />}
            >
              {atRiskJobs.length === 0 ? (
                <Empty body="Every job has its models. Nice." />
              ) : (
                <ul className="divide-y divide-paper-border">
                  {atRiskJobs.map((j) => (
                    <li key={j.id} className="py-2.5 text-sm">
                      <Link href={`/agency/jobs/${j.id}`} className="block hover:text-ink-muted">
                        <div className="font-medium truncate">{j.title}</div>
                        <div className="text-xs text-board-onJob mt-0.5">
                          {fmtDate(j.startDate)} · no models confirmed yet
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {rebookCandidates.length > 0 && (
            <Card
              title="Rebook candidates"
              link="/agency/clients"
              icon={<History size={14} />}
            >
              <ul className="divide-y divide-paper-border">
                {rebookCandidates.map((c) => {
                  const daysSince = Math.floor(
                    (Date.now() - c.lastEnd.getTime()) / 86400000,
                  );
                  return (
                    <li key={c.clientId} className="py-2.5 flex items-center gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{c.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-ink-subtle">
                          {c.count} jobs · last {daysSince}d ago
                          {c.companyName ? ` · ${c.companyName}` : ""}
                        </div>
                      </div>
                      <Link
                        href={`/agency/jobs/new?clientId=${c.clientId}`}
                        className="ll-btn-ghost text-xs"
                      >
                        New job <ArrowRight size={11} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Card
            title="Recently confirmed"
            link="/agency/jobs"
            icon={<TrendingUp size={14} className="text-board-confirmed" />}
          >
            {recentlyConfirmed.length === 0 ? (
              <Empty body="When you confirm a model on a job they show up here." />
            ) : (
              <ul className="divide-y divide-paper-border">
                {recentlyConfirmed.map((a) => (
                  <li key={a.id} className="py-2.5 flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-board-confirmed/20 text-board-confirmed text-[10px] font-medium flex items-center justify-center shrink-0">
                      {initials(a.model.user.displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{a.model.user.displayName}</span>
                      <span className="text-ink-muted"> on </span>
                      <Link
                        href={`/agency/jobs/${a.job.id}`}
                        className="text-ink hover:underline underline-offset-4"
                      >
                        {a.job.title}
                      </Link>
                    </div>
                    <span className="text-[10px] text-ink-subtle">
                      {a.confirmedAt ? timeAgo(a.confirmedAt) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <aside className="space-y-6 mt-6">
          <Card
            title="Notifications"
            link="/agency/messages"
            icon={<MessageSquare size={14} />}
            badge={unreadMessages > 0 ? unreadMessages : undefined}
          >
            {recentNotifications.length === 0 ? (
              <Empty body="You're all caught up." />
            ) : (
              <ul className="divide-y divide-paper-border">
                {recentNotifications.map((n) => (
                  <NotificationRow key={n.id} n={n} />
                ))}
              </ul>
            )}
          </Card>

          <div className="ll-card p-5 space-y-3 animate-card-in">
            <h3 className="text-xs uppercase tracking-wider text-ink-subtle">
              Bookings pulse
            </h3>
            <PulseRow icon={<Users size={13} />} label="Active models" value={activeCount} href="/agency/roster" />
            <PulseRow icon={<Briefcase size={13} />} label="Total jobs" value={jobCount} href="/agency/jobs" />
            <PulseRow
              icon={<Radio size={13} />}
              label="Pending replies"
              value={pendingBroadcastReplies}
              href="/agency/broadcasts"
              tone={pendingBroadcastReplies > 0 ? "warn" : undefined}
            />
            <PulseRow
              icon={<Receipt size={13} />}
              label="Overdue invoices"
              value={overdueInvoices}
              href="/agency/invoices?status=OVERDUE"
              tone={overdueInvoices > 0 ? "danger" : undefined}
            />
            <PulseRow
              icon={<ShieldCheck size={13} />}
              label="Docs expiring"
              value={expiringDocs}
              href="/agency/compliance"
              tone={expiringDocs > 0 ? "warn" : undefined}
            />
          </div>

          <div className="ll-card p-5 animate-card-in">
            <h3 className="text-xs uppercase tracking-wider text-ink-subtle mb-3">Quick links</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/agency/board" className="ll-btn-secondary text-xs">
                <CalendarRange size={12} /> Board
              </Link>
              <Link href="/agency/roster" className="ll-btn-secondary text-xs">
                <Users size={12} /> Roster
              </Link>
              <Link href="/agency/invoices/new" className="ll-btn-secondary text-xs">
                <Receipt size={12} /> Invoice
              </Link>
              <Link href="/agency/prospects" className="ll-btn-secondary text-xs">
                <TrendingUp size={12} /> Scout
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Card({
  title,
  link,
  icon,
  badge,
  children,
}: {
  title: string;
  link?: string;
  icon?: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="ll-card p-5 animate-card-in">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{title}</span>
          {badge !== undefined && (
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-md bg-accent text-white">
              {badge}
            </span>
          )}
        </div>
        {link && (
          <Link
            href={link}
            className="text-[11px] text-ink-subtle hover:text-ink inline-flex items-center gap-1"
          >
            View all <ArrowRight size={11} />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

function PulseRow({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href: string;
  tone?: "warn" | "danger";
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 text-sm hover:bg-paper -mx-1 px-1 py-1 rounded-md"
    >
      <span
        className={cn(
          "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
          tone === "danger"
            ? "bg-red-50 text-red-600"
            : tone === "warn"
              ? "bg-board-option2/40 text-board-option1"
              : "bg-paper text-ink-muted",
        )}
      >
        {icon}
      </span>
      <span className="flex-1 text-ink-muted">{label}</span>
      <span className={cn("font-medium", tone === "danger" && "text-red-600")}>
        {value}
      </span>
    </Link>
  );
}

function NotificationRow({
  n,
}: {
  n: { id: string; type: string; payload: unknown; read: boolean; createdAt: Date };
}) {
  const p = (n.payload ?? {}) as Record<string, unknown>;
  const sender = (p.senderName as string) ?? "";
  const preview = (p.preview as string) ?? (p.fileName as string) ?? "";
  let title = n.type;
  switch (n.type) {
    case "MESSAGE":
      title = `${sender}: ${preview}`;
      break;
    case "BROADCAST":
      title = `Broadcast — ${preview}`;
      break;
    case "CALLSHEET":
      title = `Call sheet posted: ${preview}`;
      break;
    case "OVERDUE_ROLLUP":
      title = `${p.count} invoice${(p.count as number) === 1 ? "" : "s"} overdue`;
      break;
    case "DOC_EXPIRY_ROLLUP":
      title = `${p.count} doc${(p.count as number) === 1 ? "" : "s"} expiring soon`;
      break;
  }

  return (
    <li className={cn("py-2 text-sm", !n.read && "border-l-2 border-accent pl-2 -ml-1")}>
      <div className="truncate">{title}</div>
      <div className="text-[10px] text-ink-subtle mt-0.5">{timeAgo(n.createdAt)}</div>
    </li>
  );
}

function Empty({ body }: { body: string }) {
  return <p className="text-sm text-ink-muted py-3 text-center">{body}</p>;
}

function greet(hour: number): string {
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
