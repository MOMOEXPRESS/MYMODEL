import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CalendarRange } from "lucide-react";

export default function BoardPage() {
  return (
    <div>
      <PageHeader
        title="Board"
        subtitle="The killer view — 30 days, every model, every hold."
      />
      <div className="px-8 py-8">
        <EmptyState
          icon={<CalendarRange size={20} />}
          title="The Board is coming in Sprint 2"
          body="A roster × days grid with click-to-edit holds, drag-to-bulk assign, and live conflict detection. It is the single feature that decides whether this product works."
        />
      </div>
    </div>
  );
}
