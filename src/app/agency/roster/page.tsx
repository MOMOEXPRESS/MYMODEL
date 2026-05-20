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
  searchParams: Promise<{ q?: string; division?: string; status?: string; view?: string; city?: string }>;
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
  const city = sp.city?.trim() || undefined;
  const view: ViewMode = VIEWS.includes(sp.view as ViewMode) ? (sp.view as ViewMode) : "grid";

  // Cities dropdown sources: agency.cities if the owner set them, plus any
  // distinct baseCity values already in the roster.
  const rosterCities = await prisma.model.findMany({
    where: { agencyId: user.agencyId, baseCity: { not: null } },
    select: { baseCity: true },
    distinct: ["baseCity"],
  });
  const cities = Array.from(
    new Set(
      [
        ...(user.agency.cities ?? []),
        ...rosterCities.map((r) => r.baseCity).filter((c): c is string => Boolean(c)),
      ].filter(Boolean),
    ),
  ).sort();

  const where: Prisma.ModelWhereInput = {
    agencyId: user.agencyId,
    ...(division ? { division } : {}),
    ...(status ? { status } : {}),
    ...(city ? { baseCity: city } : {}),
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
        eyebrow={`${user.agency.name} · Talent`}
        title="Roster"
        subtitle={`${totalCount} ${totalCount === 1 ? "model" : "models"} on your books — editorial index, not a spreadsheet.`}
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle current={view} />
            <Link href="/agency/settings" className="ll-btn-secondary">
              Invite models
            </Link>
          </div>
        }
      >
        <RosterFilters defaultQ={q} division={division} status={status} city={city} cities={cities} />
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
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10">
            {models.map((m, i) => {
              const measurements = (m.measurements ?? {}) as Record<string, unknown>;
              const height =
                typeof measurements.heightCm === "number"
                  ? `${measurements.heightCm} cm`
                  : null;
              const hero = m.portfolio[0];
              const index = String(i + 1).padStart(2, "0");
              return (
                <li key={m.userId} className="group">
                  <Link href={`/agency/models/${m.userId}`} className="ll-project-card">
                    <div className="aspect-[4/5] bg-paper relative overflow-hidden">
                      {hero ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={hero.url}
                          alt={modelDisplay(m)}
                          loading="lazy"
                          className="w-full h-full object-cover grayscale-[0.15] group-hover:grayscale-0 transition-all duration-700 ease-editorial"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-paper-muted border-b border-paper-border">
                          <span className="font-serif text-5xl text-editorial-warm/40">
                            {initials(modelDisplay(m))}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="font-mono text-[10px] uppercase tracking-editorial text-ink/90 bg-paper/80 backdrop-blur-sm px-2 py-1 border border-paper-border">
                          {index}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <StatusDot status={m.status} />
                      </div>
                    </div>
                    <div className="px-4 py-4 border-t border-paper-border">
                      <h2 className="font-serif text-xl tracking-tight text-ink leading-none">
                        {modelDisplay(m)}
                      </h2>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-editorial text-ink-subtle">
                        {m.division.replace("_", " ")}
                        {height ? ` · ${height}` : ""}
                        {m.baseCity ? ` · ${m.baseCity}` : ""}
                      </p>
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
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-paper-muted ring-1 ring-paper-border shrink-0">
                            {hero ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={hero.url}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-editorial-warm text-xs font-medium">
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
            ? "bg-paper-hover text-ink border-editorial-warm/40"
            : "bg-paper-elevated hover:bg-paper text-ink-muted",
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
            ? "bg-paper-hover text-ink border-editorial-warm/40"
            : "bg-paper-elevated hover:bg-paper text-ink-muted",
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
