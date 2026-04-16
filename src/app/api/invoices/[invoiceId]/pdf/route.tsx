import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { InvoicePDF } from "./invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "AGENCY_STAFF") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { invoiceId } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lineItems: true, agency: true },
  });
  if (!invoice || invoice.agencyId !== actor.agencyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    <InvoicePDF invoice={invoice} agency={invoice.agency} />,
  );

  const safe = invoice.number.replace(/[^\w\-.]/g, "_");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="Facture ${safe}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
