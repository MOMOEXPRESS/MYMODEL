// GET /api/search?q=foo
// Tenant-scoped search across models, jobs, invoices, contracts, prospects.
// Returns up to 5 hits per type, ranked by name match.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export type SearchHit = {
  type: "model" | "job" | "invoice" | "contract" | "prospect";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string;
};

export async function GET(req: Request) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "AGENCY_STAFF" || !actor.agencyId) {
    return NextResponse.json({ hits: [] });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 1) return NextResponse.json({ hits: [] });

  const ci: Prisma.StringFilter = { contains: q, mode: "insensitive" };

  const [models, jobs, invoices, contracts, prospects] = await Promise.all([
    prisma.model.findMany({
      where: {
        agencyId: actor.agencyId,
        OR: [
          { user: { displayName: ci } },
          { user: { email: ci } },
        ],
      },
      include: {
        user: { select: { displayName: true, email: true } },
        portfolio: {
          where: { kind: { in: ["BOOK", "POLAROID"] } },
          orderBy: [{ kind: "asc" }, { order: "asc" }],
          take: 1,
        },
      },
      take: 5,
    }),
    prisma.job.findMany({
      where: {
        agencyId: actor.agencyId,
        deletedAt: null,
        OR: [{ title: ci }, { brief: ci }],
      },
      orderBy: { startDate: "desc" },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        agencyId: actor.agencyId,
        deletedAt: null,
        OR: [{ number: ci }, { clientName: ci }, { clientCompany: ci }],
      },
      orderBy: { issuedAt: "desc" },
      take: 5,
    }),
    prisma.contract.findMany({
      where: { agencyId: actor.agencyId, deletedAt: null, title: ci },
      take: 5,
    }),
    prisma.prospect.findMany({
      where: { agencyId: actor.agencyId, name: ci },
      take: 5,
    }),
  ]);

  const hits: SearchHit[] = [
    ...models.map((m): SearchHit => ({
      type: "model",
      id: m.userId,
      title: m.user.displayName,
      subtitle: `${m.division.replace("_", " ").toLowerCase()} · model`,
      href: `/agency/models/${m.userId}`,
      imageUrl: m.portfolio[0]?.url,
    })),
    ...jobs.map((j): SearchHit => ({
      type: "job",
      id: j.id,
      title: j.title,
      subtitle: `${j.type.toLowerCase()} · ${j.startDate.toISOString().slice(0, 10)}`,
      href: `/agency/jobs/${j.id}`,
    })),
    ...invoices.map((i): SearchHit => ({
      type: "invoice",
      id: i.id,
      title: i.number,
      subtitle: `${i.clientName} · ${i.currency} ${i.total.toFixed(0)}`,
      href: `/agency/invoices/${i.id}`,
    })),
    ...contracts.map((c): SearchHit => ({
      type: "contract",
      id: c.id,
      title: c.title,
      subtitle: `${c.kind.replace("_", " ").toLowerCase()} · ${c.status.toLowerCase()}`,
      href: `/agency/contracts`,
    })),
    ...prospects.map((p): SearchHit => ({
      type: "prospect",
      id: p.id,
      title: p.name,
      subtitle: `prospect · ${p.status.toLowerCase()}`,
      href: `/agency/prospects`,
    })),
  ];

  return NextResponse.json({ hits });
}
