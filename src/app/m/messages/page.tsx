import { requireModel } from "@/lib/auth-guards";
import { getModelConversation, getOrCreateConversation } from "@/lib/conversations";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/empty-state";
import { MessageSquare } from "lucide-react";
import { ConversationThread } from "@/components/conversation-thread";

export default async function ModelMessages() {
  const user = await requireModel();
  let conversationId = await getModelConversation(user.id);

  // If the model has never received a message but the agency has staff, spin up
  // a conversation lazily so they can initiate.
  if (!conversationId) {
    const anyStaff = await prisma.user.findFirst({
      where: { agencyId: user.agencyId!, role: "AGENCY_STAFF" },
      orderBy: { createdAt: "asc" },
    });
    if (anyStaff) {
      conversationId = await getOrCreateConversation({
        agencyId: user.agencyId!,
        staffUserId: anyStaff.id,
        modelUserId: user.id,
      });
    }
  }

  const agency = user.agency;

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">Messages</h1>
      <p className="mt-2 text-sm text-ink-muted">Your agency.</p>

      <div className="mt-6">
        {conversationId ? (
          <ConversationThread
            conversationId={conversationId}
            meUserId={user.id}
            counterpartName={agency?.name ?? "Agency"}
          />
        ) : (
          <EmptyState
            icon={<MessageSquare size={20} />}
            title="No conversation yet"
            body="Once anyone at your agency sends you a message, you'll see it here."
          />
        )}
      </div>
    </div>
  );
}
