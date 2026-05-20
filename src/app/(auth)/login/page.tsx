import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div>
      <h1 className="mk-display text-2xl text-[#f5f0eb]">Sign in</h1>
      <p className="mt-2 text-sm text-[#9c958d] leading-relaxed">
        Agency teams, models, clients, and creatives — you&apos;ll land in the right workspace.
      </p>
      <LoginForm />
      <p className="mt-6 text-sm">
        <Link className="text-[#e8a4b8] hover:text-[#f5f0eb] font-medium" href="/forgot-password">
          Forgot password?
        </Link>
      </p>
      <div className="mt-8 pt-6 border-t border-white/10 space-y-2 text-sm text-[#9c958d]">
        <p>
          Agency?{" "}
          <Link className="text-[#f5f0eb] font-medium hover:underline" href="/signup/agency">
            Create workspace
          </Link>
        </p>
        <p>
          Model?{" "}
          <Link className="text-[#f5f0eb] font-medium hover:underline" href="/signup/model">
            Join with code
          </Link>
        </p>
        <p>
          Client?{" "}
          <Link className="text-[#f5f0eb] font-medium hover:underline" href="/signup/client">
            Client account
          </Link>
        </p>
        <p>
          Creative?{" "}
          <Link className="text-[#f5f0eb] font-medium hover:underline" href="/signup/creative">
            Creative account
          </Link>
        </p>
      </div>
    </div>
  );
}
