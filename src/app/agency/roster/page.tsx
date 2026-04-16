import Link from "next/link";
import { Prisma, Division, ModelStatus } from "@prisma/client";
import { Users, LayoutGrid, List } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { initials, modelDisplay, cn } from "@/lib/utils";
import { RosterFilters } from "./roster-filters";

const DIVISIONS: Division[] = ["WOMEN", "MEN", "CURVE", "KIDS", "TALENTS", "NEW_FACES"];
const STATUSES: ModelStatus[] = ["ACTIVE", "ON_LEAVE", "INACTIVE"];
const VIEWS = ["grid", "list"] as const;
type ViewMode = (typeof VIEWS)[number];

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; division?: string; status?: string; view?: string }>;
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
  const view: ViewMode = VIEWS.includes(sp.view as ViewMode) ? (sp.view as ViewMode) : "grid";

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
      include: {
        user: true,
        // One hero photo per model: prefer BOOK, fall back to POLAROID.
        portfolio: {
          where: { kind: { in: ["BOOK", "POLAROID"] } },
          orderBy: [{ kind: "asc" }, { order: "asc" }],
          take: 1,
        },
      },
      orderBy: { user: { displayName: "asc" } },
    }),
    prisma.model.count({ where: { agencyId: user.agencyId } }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow={`Agency · ${user.agency.name}`}
        title="Roster"
        subtitle={`${totalCount} ${totalCount === 1 ? "model" : "models"} on your books.`}
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle current={view} />
            <Link href="/agency/settings" className="ll-btn-secondary">
              Invite models
            </Link>
          </div>
        }
      >
        <RosterFilters defaultQ={q} division={division} status={status} />
      </PageHeader>

      <div className="px-8 py-8">
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
        ) : view === "grid" ? (
          // Every card is a large tile — equivalent to four of the old small
          // cards. Half as many columns per breakpoint, bigger photos, richer
          // captions (name + division + height overlaid on the hero).
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {models.map((m) => {
              const measurements = (m.measurements ?? {}) as Record<string, unknown>;
              const height =
                typeof measurements.heightCm === "number"
                  ? `${measurements.heightCm} cm`
                  : null;
              const hero = m.portfolio[0];
              return (
                <li key={m.userId} className="group animate-card-in">
                  <Link
                    href={`/agency/models/${m.userId}`}
                    className="block rounded-2xl overflow-hidden border border-paper-border bg-paper-elevated hover:border-ink-subtle transition-all hover:-translate-y-1 hover:shadow-xl relative"
                  >
                    <div className="aspect-square bg-paper relative overflow-hidden">
                      {hero ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={hero.url}
                          alt={modelDisplay(m)}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-soft/70 to-paper">
                          <span className="font-serif text-7xl text-accent">
                            {initials(modelDisplay(m))}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white">
                        <div className="font-serif text-2xl tracking-tight leading-none">
                          {modelDisplay(m)}
                        </div>
                        <div className="mt-1.5 text-[11px] uppercase tracking-[0.15em] opacity-90">
                          {m.division.replace("_", " ")}
                          {height && ` · ${height}`}
                        </div>
                      </div>

                      <div className="absolute top-3 right-3">
                        <StatusDot status={m.status} />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          // Preserve the table view for power users.
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
                  const hero = m.portfolio[0];
                  return (
                    <tr
                      key={m.userId}
                      className="border-b border-paper-border last:border-0 hover:bg-paper/50"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/agency/models/${m.userId}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-accent-soft shrink-0">
                            {hero ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={hero.url}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-accent text-xs font-medium">
                                {initials(modelDisplay(m))}
                              </div>
                            )}
                          </div>
                          <span className="font-medium group-hover:underline underline-offset-4">
                            {modelDisplay(m)}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">
                        {m.division.replace("_", " ")}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <StatusDot status={m.status} />
                          <span>{m.status.replace("_", " ").toLowerCase()}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{height}</td>
                      <td className="px-5 py-3 text-ink-muted hidden md:table-cell">
                        {m.user.email}
                      </td>
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

function StatusDot({ status }: { status: ModelStatus }) {
  const color =
    status === "ACTIVE"
      ? "bg-board-confirmed"
      : status === "ON_LEAVE"
        ? "bg-board-option1"
        : "bg-ink-subtle";
  return (
    <span
      className={`w-2 h-2 rounded-full ring-2 ring-paper-elevated ${color}`}
      title={status.toLowerCase()}
    />
  );
}

function ViewToggle({ current }: { current: ViewMode }) {
  return (
    <div className="flex rounded-lg border border-paper-border overflow-hidden">
      <Link
        href={`?${buildQuery({ view: "grid" })}`}
        aria-current={current === "grid" ? "page" : undefined}
        className={cn(
          "px-2.5 py-1.5 text-xs flex items-center gap-1.5",
          current === "grid"
            ? "bg-ink text-paper"
            : "bg-paper-elevated hover:bg-paper",
        )}
      >
        <LayoutGrid size={13} /> Cards
      </Link>
      <Link
        href={`?${buildQuery({ view: "list" })}`}
        aria-current={current === "list" ? "page" : undefined}
        className={cn(
          "px-2.5 py-1.5 text-xs flex items-center gap-1.5 border-l border-paper-border",
          current === "list"
            ? "bg-ink text-paper"
            : "bg-paper-elevated hover:bg-paper",
        )}
      >
        <List size={13} /> List
      </Link>
    </div>
  );
}

function buildQuery(patch: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(patch)) sp.set(k, v);
  return sp.toString();
}
