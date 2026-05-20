import Link from "next/link";
import { AgencySignupForm } from "./agency-signup-form";

export default function AgencySignupPage() {
  return (
    <div>
      <Link href="/" className="text-sm text-[#9c958d]">&larr; Back</Link>
      <h1 className="mt-6 mk-display text-3xl text-[#f5f0eb] tracking-tight">Start your agency</h1>
      <p className="mt-2 text-sm text-[#9c958d]">
        Create your agency and invite your roster. No credit card required.
      </p>
      <AgencySignupForm />
      <p className="mt-6 text-sm text-[#9c958d]">
        Already have an account? <Link className="text-[#f5f0eb] underline underline-offset-4" href="/login">Log in</Link>
      </p>
    </div>
  );
}
