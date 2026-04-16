import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";
import { NewJobForm } from "./new-job-form";

export default async function NewJobPage() {
  const user = await requireAgencyStaff();
  return (
    <div>
      <div className="px-8 pt-8">
        <Link href="/agency/jobs" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> All jobs
        </Link>
      </div>
      <PageHeader title="New job" subtitle="Set the brief once. Attach models next." />
      <div className="px-8 pb-12 max-w-2xl">
        <NewJobForm defaultCurrency={user.agency.currency} />
      </div>
    </div>
  );
}
