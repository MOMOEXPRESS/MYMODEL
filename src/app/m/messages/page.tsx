import { EmptyState } from "@/components/empty-state";
import { MessageSquare } from "lucide-react";

export default function ModelMessagesPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">Messages</h1>
      <p className="mt-2 text-sm text-ink-muted">Talk to your agency.</p>
      <div className="mt-8">
        <EmptyState
          icon={<MessageSquare size={20} />}
          title="No conversations yet"
          body="When your agency reaches out you will see their messages here."
        />
      </div>
    </div>
  );
}
