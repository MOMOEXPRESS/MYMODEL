import Link from "next/link";
import { prisma } from "@/lib/db";
import { TeamSignupForm } from "./team-signup-form";

export default async function TeamSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token;

  let state: "invalid" | "expired" | "used" | "ok" = "invalid";
  let invite: { email: string; agencyName: string; role: string } | null = null;

  if (token) {
    const found = await prisma.teamInvite.findUnique({
      where: { token },
      include: { agency: { select: { name: true } } },
    });
    if (!found) state = "invalid";
    else if (found.consumedAt) state = "used";
    else if (found.expiresAt && found.expiresAt < new Date()) state = "expired";
    else {
      state = "ok";
      invite = {
        email: found.email,
        agencyName: found.agency.name,
        role: found.role,
      };
    }
  }

  return (
    <div>
      <Link href="/" className="text-sm text-ink-muted">
        &larr; Back
      </Link>
      <h1 className="mt-6 font-serif text-3xl tracking-tight">Join your team</h1>

      {state !== "ok" || !invite ? (
        <p className="mt-4 text-sm text-ink-muted">
          {state === "invalid" && "This invite link isn't valid."}
          {state === "used" && "This invite has already been used."}
          {state === "expired" && "This invite has expired — ask your agency owner for a new link."}
          {!token && "Follow the invite link your agency owner sent you."}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-muted">
            Accept the invite from <strong>{invite.agencyName}</strong> to join as a {invite.role.toLowerCase()}.
          </p>
          <TeamSignupForm token={token!} prefillEmail={invite.email} />
        </>
      )}

      <p className="mt-6 text-sm text-ink-muted">
        Already have an account? <Link className="text-ink underline underline-offset-4" href="/login">Log in</Link>
      </p>
    </div>
  );
}
