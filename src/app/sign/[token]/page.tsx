import Link from "next/link";
import { prisma } from "@/lib/db";
import { SignForm } from "./sign-form";

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const contract = await prisma.contract.findUnique({
    where: { sigToken: token },
    include: { agency: { select: { name: true } } },
  });
  const expired = Boolean(
    contract?.sigTokenExpiresAt && contract.sigTokenExpiresAt < new Date(),
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-paper">
      <div className="w-full max-w-xl ll-card p-8">
        <div className="text-[10px] uppercase tracking-widest text-ink-subtle">Signature</div>

        {!contract ? (
          <>
            <h1 className="mt-2 font-serif text-2xl">Link invalid or already used</h1>
            <p className="mt-3 text-sm text-ink-muted">
              This signing link isn&apos;t valid. Ask the agency to resend.
            </p>
            <Link href="/" className="mt-6 inline-block ll-btn-secondary">
              &larr; Home
            </Link>
          </>
        ) : expired ? (
          <>
            <h1 className="mt-2 font-serif text-2xl">Link has expired</h1>
            <p className="mt-3 text-sm text-ink-muted">
              For security, signing links expire after 14 days. Ask the agency to send a fresh one.
            </p>
          </>
        ) : contract.status === "SIGNED" ? (
          <>
            <h1 className="mt-2 font-serif text-2xl">Already signed</h1>
            <p className="mt-3 text-sm text-ink-muted">
              This contract was signed on {contract.signedAt?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-serif text-2xl">{contract.title}</h1>
            <p className="mt-2 text-sm text-ink-muted">
              From <strong>{contract.agency.name}</strong>. Please review the document, then type
              your full legal name below to sign.
            </p>

            {contract.fileUrl && (
              <a
                href={contract.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 ll-btn-secondary"
              >
                Review contract (opens in new tab)
              </a>
            )}

            <SignForm token={token} />

            <p className="mt-6 text-[11px] text-ink-subtle leading-relaxed">
              By signing, you consent to an electronic signature with the same legal
              effect as a handwritten one. For eIDAS-qualified signatures, your agency
              will migrate this flow to YouSign — the contract and audit trail stay in
              LuxLane either way.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
