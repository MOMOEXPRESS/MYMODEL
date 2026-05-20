import Link from "next/link";
import { PlatformSignupForm } from "../platform-signup-form";

export default function SignupCreativePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Creative account</h1>
      <p className="mt-2 text-sm text-[#9c958d]">
        For photographers, stylists, MUAs, and production creatives.
      </p>
      <PlatformSignupForm role="CREATIVE" showCreativeFields />
      <p className="mt-6 text-sm text-[#9c958d]">
        Model with an agency?{" "}
        <Link href="/signup/model" className="text-accent font-medium">
          Join with agency code
        </Link>
      </p>
    </div>
  );
}
