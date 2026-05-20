import Link from "next/link";
import { PlatformSignupForm } from "../platform-signup-form";

export default function SignupClientPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Client account</h1>
      <p className="mt-2 text-sm text-[#9c958d]">
        For brands, photographers, designers, and anyone hiring talent.
      </p>
      <PlatformSignupForm role="CLIENT" showClientFields />
      <p className="mt-6 text-sm text-[#9c958d]">
        Agency?{" "}
        <Link href="/signup/agency" className="text-accent font-medium">
          Create agency workspace
        </Link>
      </p>
    </div>
  );
}
