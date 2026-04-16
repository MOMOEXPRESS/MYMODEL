import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { getOrCreateConversation } from "@/lib/conversations";
import { prisma } from "@/lib/db";
import { ConversationThread } from "@/components/conversation-thread";

export default async function AgencyMessageThread({
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

  const conversationId = await getOrCreateConversation({
    agencyId: user.agencyId,
    staffUserId: user.id,
    modelUserId: modelId,
  });

  return (
    <div>
      <div className="px-8 pt-8">
        <Link href="/agency/messages" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> All messages
        </Link>
      </div>
      <div className="px-8 py-6 max-w-3xl">
        <ConversationThread
          conversationId={conversationId}
          meUserId={user.id}
          counterpartName={model.user.displayName}
        />
      </div>
    </div>
  );
}
