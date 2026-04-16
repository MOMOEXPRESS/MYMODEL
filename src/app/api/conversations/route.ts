import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getOrCreateConversation,
  listAgencyConversations,
  getModelConversation,
} from "@/lib/conversations";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "AGENCY_STAFF" && user.agencyId) {
    const list = await listAgencyConversations({
      agencyId: user.agencyId,
      staffUserId: user.id,
    });
    return NextResponse.json({ conversations: list });
  }

  if (user.role === "MODEL") {
    const convId = await getModelConversation(user.id);
    return NextResponse.json({ conversationId: convId });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "AGENCY_STAFF" || !user.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const modelUserId = body?.modelUserId;
  if (typeof modelUserId !== "string") {
    return NextResponse.json({ error: "modelUserId required" }, { status: 400 });
  }
  try {
    const conversationId = await getOrCreateConversation({
      agencyId: user.agencyId,
      staffUserId: user.id,
      modelUserId,
    });
    return NextResponse.json({ conversationId });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
