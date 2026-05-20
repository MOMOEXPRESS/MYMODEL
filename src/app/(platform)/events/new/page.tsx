import { createGroupEvent } from "@/app/events/actions";
import { PageHeader } from "@/components/page-header";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TYPES = ["COLLAB", "SHOOT", "CASTING", "FITTING", "SHOW", "MEETING", "OTHER"];

export default async function NewEventPage() {
  const user = await getSessionUser();
  const agencyJobs =
    user?.role === "AGENCY_STAFF" && user.agencyId
      ? await prisma.job.findMany({
          where: { agencyId: user.agencyId, deletedAt: null, status: { in: ["OPEN", "CONFIRMED", "IN_PROGRESS"] } },
          select: { id: true, title: true },
          orderBy: { startDate: "desc" },
          take: 30,
        })
      : [];

  return (
    <div className="p-6 lg:p-8 max-w-lg">
      <PageHeader title="New group event" subtitle="Invite your network to collaborate." />
      <form action={createGroupEvent} className="mt-8 space-y-4">
        <div>
          <label className="ll-label" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" required className="ll-input" />
        </div>
        <div>
          <label className="ll-label" htmlFor="type">
            Type
          </label>
          <select id="type" name="type" className="ll-input">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        {agencyJobs.length > 0 && (
          <div>
            <label className="ll-label" htmlFor="linkedJobId">
              Link to agency booking (optional)
            </label>
            <select id="linkedJobId" name="linkedJobId" className="ll-input">
              <option value="">None</option>
              {agencyJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="ll-label" htmlFor="startDate">
            Start date
          </label>
          <input id="startDate" name="startDate" type="date" required className="ll-input" />
        </div>
        <div>
          <label className="ll-label" htmlFor="city">
            City
          </label>
          <input id="city" name="city" className="ll-input" />
        </div>
        <div>
          <label className="ll-label" htmlFor="location">
            Location
          </label>
          <input id="location" name="location" className="ll-input" />
        </div>
        <div>
          <label className="ll-label" htmlFor="description">
            Description
          </label>
          <textarea id="description" name="description" rows={4} className="ll-input" />
        </div>
        <button type="submit" className="ll-btn-primary w-full">
          Create event
        </button>
      </form>
    </div>
  );
}
