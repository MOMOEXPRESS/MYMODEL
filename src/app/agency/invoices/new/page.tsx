import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { NewInvoiceForm } from "./new-invoice-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const user = await requireAgencyStaff();
  const sp = await searchParams;

  const jobs = await prisma.job.findMany({
    where: {
      agencyId: user.agencyId,
      status: { in: ["CONFIRMED", "IN_PROGRESS", "DONE"] },
    },
    include: { contacts: { where: { role: "CLIENT" }, take: 1 } },
    orderBy: { endDate: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="px-8 pt-8">
        <Link href="/agency/invoices" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> All invoices
        </Link>
      </div>
      <PageHeader title="New invoice" subtitle="Generate from a confirmed job — or raise a standalone invoice." />
      <div className="px-8 pb-12 max-w-2xl">
        <NewInvoiceForm
          jobs={jobs.map((j) => ({
            id: j.id,
            title: j.title,
            contact: j.contacts[0]
              ? {
                  name: j.contacts[0].name,
                  company: j.contacts[0].company,
                  email: j.contacts[0].email,
                }
              : null,
          }))}
          preselectedJobId={sp.jobId ?? ""}
        />
      </div>
    </div>
  );
}
