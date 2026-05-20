import Link from "next/link";
import { ModelSignupForm } from "./model-signup-form";

export default function ModelSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  return (
    <div>
      <Link href="/" className="text-sm text-[#9c958d]">&larr; Back</Link>
      <h1 className="mt-6 mk-display text-3xl text-[#f5f0eb] tracking-tight">Join your agency</h1>
      <p className="mt-2 text-sm text-[#9c958d]">
        Use the signup code your agency gave you. No code? Ask your booker.
      </p>
      <ModelSignupForm searchParams={searchParams} />
      <p className="mt-6 text-sm text-[#9c958d]">
        Already signed up? <Link className="text-[#f5f0eb] underline underline-offset-4" href="/login">Log in</Link>
      </p>
    </div>
  );
}
