import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";
import { initials } from "@/lib/utils";

export default async function RosterPage() {
  const user = await requireAgencyStaff();

  const models = await prisma.model.findMany({
    where: { agencyId: user.agencyId },
    include: { user: true },
    orderBy: { user: { displayName: "asc" } },
  });

  return (
    <div>
      <PageHeader
        title="Roster"
        subtitle={`${models.length} ${models.length === 1 ? "model" : "models"} on your roster.`}
      />
      <div className="px-8 py-8">
        {models.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title="No models yet"
            body={`Share your agency code "${user.agency.signupCode}" with a model to let them sign up.`}
          />
        ) : (
          <div className="ll-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-paper border-b border-paper-border text-ink-subtle text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Model</th>
                  <th className="text-left font-medium px-5 py-3">Division</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                  <th className="text-left font-medium px-5 py-3">Height</th>
                  <th className="text-left font-medium px-5 py-3">Email</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => {
                  const measurements = (m.measurements ?? {}) as Record<string, unknown>;
                  const height = typeof measurements.heightCm === "number" ? `${measurements.heightCm} cm` : "—";
                  return (
                    <tr key={m.userId} className="border-b border-paper-border last:border-0 hover:bg-paper/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-medium flex items-center justify-center">
                            {initials(m.user.displayName)}
                          </div>
                          <span className="font-medium">{m.user.displayName}</span>
                        </div>
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
                      <td className="px-5 py-3 text-ink-muted">{m.user.email}</td>
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
