import Link from "next/link";
import { Prisma, Division, ModelStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";
import { initials } from "@/lib/utils";
import { RosterFilters } from "./roster-filters";

const DIVISIONS: Division[] = ["WOMEN", "MEN", "CURVE", "KIDS", "TALENTS", "NEW_FACES"];
const STATUSES: ModelStatus[] = ["ACTIVE", "ON_LEAVE", "INACTIVE"];

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; division?: string; status?: string }>;
}) {
  const user = await requireAgencyStaff();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const division = DIVISIONS.includes(sp.division as Division)
    ? (sp.division as Division)
    : undefined;
  const status = STATUSES.includes(sp.status as ModelStatus)
    ? (sp.status as ModelStatus)
    : undefined;

  const where: Prisma.ModelWhereInput = {
    agencyId: user.agencyId,
    ...(division ? { division } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          user: {
            OR: [
              { displayName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [models, totalCount] = await Promise.all([
    prisma.model.findMany({
      where,
      include: { user: true },
      orderBy: { user: { displayName: "asc" } },
    }),
    prisma.model.count({ where: { agencyId: user.agencyId } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Roster"
        subtitle={`${totalCount} ${totalCount === 1 ? "model" : "models"} on your roster.`}
        actions={
          <Link href="/agency/settings" className="ll-btn-secondary">
            Invite models
          </Link>
        }
      />
      <div className="px-8 py-6">
        <RosterFilters defaultQ={q} division={division} status={status} />
      </div>

      <div className="px-8 pb-12">
        {models.length === 0 ? (
          totalCount === 0 ? (
            <EmptyState
              icon={<Users size={20} />}
              title="No models yet"
              body={`Share your agency code "${user.agency.signupCode}" with a model to let them sign up.`}
            />
          ) : (
            <EmptyState
              icon={<Users size={20} />}
              title="No models match"
              body="Try clearing the filters or the search."
            />
          )
        ) : (
          <div className="ll-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-paper border-b border-paper-border text-ink-subtle text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Model</th>
                  <th className="text-left font-medium px-5 py-3">Division</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                  <th className="text-left font-medium px-5 py-3">Height</th>
                  <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Email</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => {
                  const measurements = (m.measurements ?? {}) as Record<string, unknown>;
                  const height =
                    typeof measurements.heightCm === "number"
                      ? `${measurements.heightCm} cm`
                      : "—";
                  return (
                    <tr key={m.userId} className="border-b border-paper-border last:border-0 hover:bg-paper/50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/agency/models/${m.userId}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-medium flex items-center justify-center">
                            {initials(m.user.displayName)}
                          </div>
                          <span className="font-medium group-hover:underline underline-offset-4">
                            {m.user.displayName}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{m.division.replace("_", " ")}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={
                              m.status === "ACTIVE"
                                ? "w-1.5 h-1.5 rounded-full bg-board-confirmed"
                                : m.status === "ON_LEAVE"
                                  ? "w-1.5 h-1.5 rounded-full bg-board-option1"
                                  : "w-1.5 h-1.5 rounded-full bg-ink-subtle"
                            }
                          />
                          {m.status.replace("_", " ").toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{height}</td>
                      <td className="px-5 py-3 text-ink-muted hidden md:table-cell">{m.user.email}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
