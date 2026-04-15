import { requireModel } from "@/lib/auth-guards";
import { EmptyState } from "@/components/empty-state";
import { Calendar } from "lucide-react";

export default async function ModelHome() {
  const user = await requireModel();

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">
        Hi, {user.displayName.split(" ")[0]}.
      </h1>
      <p className="mt-2 text-sm text-ink-muted">Here&apos;s what&apos;s coming up.</p>

      <div className="mt-8">
        <EmptyState
          icon={<Calendar size={20} />}
          title="Nothing yet"
          body="Holds, confirmed jobs and your next call sheet will appear here as your agency books you."
        />
      </div>
    </div>
  );
}
