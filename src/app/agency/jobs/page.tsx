import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Briefcase } from "lucide-react";

export default function JobsPage() {
  return (
    <div>
      <PageHeader title="Jobs" subtitle="Bookings, options, and confirmations." />
      <div className="px-8 py-8">
        <EmptyState
          icon={<Briefcase size={20} />}
          title="Jobs arrive in Sprint 3"
          body="Create a job, attach models with option levels, promote to confirmed, and get conflict-aware holds for free."
        />
      </div>
    </div>
  );
}
