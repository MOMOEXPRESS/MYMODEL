import Link from "next/link";
import { requireClient } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";

export default async function ClientAgenciesPage() {
  const user = await requireClient();
  const links = await prisma.client.findMany({
    where: { platformUserId: user.id },
    include: {
      agency: { select: { id: true, name: true, city: true } },
      _count: { select: { jobs: true } },
    },
    orderBy: { agency: { name: "asc" } },
  });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <DashboardHero
        eyebrow="Agencies"
        title="Your agencies"
        subtitle="Linked when your email matches a client record — bookers can invite you to jobs and briefs."
      />
      {links.length === 0 ? (
        <div className="ll-card p-8 text-center text-sm text-ink-muted">
          No agencies linked yet. Ask your booker to add <strong>{user.email}</strong> on their client
          list, or sign up with the same email they have on file.
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {links.map((l) => (
            <li key={l.id}>
              <div className="ll-card p-5">
                <h2 className="font-semibold">{l.agency.name}</h2>
                <p className="text-sm text-ink-muted mt-1">
                  {l.companyName ?? l.name}
                  {l.agency.city ? ` · ${l.agency.city}` : ""}
                </p>
                <p className="text-xs text-ink-subtle mt-2">
                  {l._count.jobs} booking{l._count.jobs === 1 ? "" : "s"}
                  {l.portalEnabled ? " · Portal active" : ""}
                </p>
                <Link href="/c/jobs" className="mt-4 inline-block text-xs font-medium text-accent">
                  View bookings →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
