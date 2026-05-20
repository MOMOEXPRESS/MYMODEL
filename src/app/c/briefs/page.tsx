import Link from "next/link";
import { requireClient } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { submitClientBrief } from "./actions";

export default async function ClientBriefsPage() {
  const user = await requireClient();
  const [agencies, briefs] = await Promise.all([
    prisma.client.findMany({
      where: { platformUserId: user.id },
      include: { agency: { select: { id: true, name: true, city: true } } },
    }),
    prisma.clientBrief.findMany({
      where: { authorUserId: user.id },
      include: { agency: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <DashboardHero
        eyebrow="Briefs"
        title="Send a brief to your agency"
        subtitle="Submit castings and campaign details — your booker can turn an accepted brief into a booking."
      />

      {agencies.length === 0 ? (
        <div className="ll-card p-6 text-sm text-ink-muted">
          Link an agency first via{" "}
          <Link href="/c/agencies" className="text-accent underline-offset-2 hover:underline">
            My agencies
          </Link>{" "}
          (same email as on their client list).
        </div>
      ) : (
        <form action={submitClientBrief} className="ll-card p-6 max-w-xl space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-muted">Agency</label>
            <select name="targetAgencyId" required className="ll-input mt-1">
              {agencies.map((a) => (
                <option key={a.agencyId} value={a.agencyId}>
                  {a.agency.name}
                  {a.agency.city ? ` · ${a.agency.city}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Title</label>
            <input name="title" required className="ll-input mt-1" placeholder="SS26 beauty campaign" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Description</label>
            <textarea name="description" rows={4} className="ll-input mt-1" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-ink-muted">Start date</label>
              <input type="date" name="startDate" defaultValue={today} className="ll-input mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">End date</label>
              <input type="date" name="endDate" className="ll-input mt-1" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-ink-muted">City</label>
              <input name="city" className="ll-input mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">Location</label>
              <input name="location" className="ll-input mt-1" />
            </div>
          </div>
          <button type="submit" className="ll-btn-primary">
            Submit brief
          </button>
        </form>
      )}

      {briefs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3">Recent briefs</h2>
          <ul className="space-y-2">
            {briefs.map((b) => (
              <li key={b.id} className="ll-card p-4 flex justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{b.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{b.agency.name}</p>
                </div>
                <span className="text-xs text-ink-subtle shrink-0">{b.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/events/new" className="ll-btn-secondary text-sm inline-flex">
        Or create a group event →
      </Link>
    </div>
  );
}
