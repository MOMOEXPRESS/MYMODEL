import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { FileText } from "lucide-react";

export default async function TearsheetsPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const user = await requireAgencyStaff();
  const { modelId } = await params;

  const model = await prisma.model.findUnique({
    where: { userId: modelId },
    include: { user: true },
  });
  if (!model || model.agencyId !== user.agencyId) notFound();

  const [assignments, book] = await Promise.all([
    prisma.jobAssignment.findMany({
      where: { modelId, status: "DONE" },
      include: {
        job: { select: { id: true, title: true, type: true, endDate: true, locationCity: true } },
      },
      orderBy: { job: { endDate: "desc" } },
    }),
    prisma.portfolioImage.findMany({
      where: { modelId, kind: "BOOK" },
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="px-8 pt-8">
        <Link
          href={`/agency/models/${modelId}`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to {model.user.displayName}
        </Link>
      </div>
      <PageHeader
        title="Tear sheets"
        subtitle={`${model.user.displayName}'s work history.`}
      />
      <div className="px-8 pb-12 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-medium">Completed jobs ({assignments.length})</h2>
          {assignments.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<FileText size={18} />}
                title="No completed jobs yet"
                body="Mark a job as DONE on the jobs page — it will appear here automatically."
              />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-paper-border ll-card overflow-hidden">
              {assignments.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <Link href={`/agency/jobs/${a.job.id}`} className="block group">
                    <div className="font-medium group-hover:underline underline-offset-4">
                      {a.job.title}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5 flex flex-wrap gap-x-2">
                      <span>{a.job.type.toLowerCase()}</span>
                      <span>
                        ·{" "}
                        {a.job.endDate.toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </span>
                      {a.job.locationCity && <span>· {a.job.locationCity}</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-medium">Book ({book.length})</h2>
          {book.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">
              Upload book photos on the model&apos;s card.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {book.map((img) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  className="aspect-[3/4] object-cover rounded-lg bg-paper border border-paper-border"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
