import Link from "next/link";
import { PlatformSignupForm } from "../platform-signup-form";

export default function SignupMemberPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Member account</h1>
      <p className="mt-2 text-sm text-[#9c958d]">
        Explore the network, follow talent, and join group events.
      </p>
      <PlatformSignupForm role="MEMBER" />
      <p className="mt-6 text-sm text-[#9c958d]">
        <Link href="/login" className="text-accent font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
