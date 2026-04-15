import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  return (
    <div>
      <PageHeader title="Messages" subtitle="Chats with your models and broadcasts." />
      <div className="px-8 py-8">
        <EmptyState
          icon={<MessageSquare size={20} />}
          title="Messages arrive in Sprint 5"
          body="1:1 conversations with your models, plus broadcasts with one-tap accept or decline for quick casting calls."
        />
      </div>
    </div>
  );
}
