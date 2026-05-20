import { requirePlatformUser } from "@/lib/auth-guards";
import { AppLogo } from "@/components/app-logo";
import { LogoutButton } from "@/components/logout-button";
import { PlatformNav } from "@/components/platform-nav";
import Link from "next/link";
import { homePathForUser } from "@/lib/routing";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePlatformUser();
  const home = homePathForUser(user.role, user.agencyMembership?.role ?? null);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-paper-border bg-paper-elevated">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <AppLogo href={home} />
          <div className="flex items-center gap-3">
            <Link href={home} className="ll-btn-ghost text-xs">
              My app
            </Link>
            <LogoutButton className="ll-btn-ghost text-xs" />
          </div>
        </div>
        <PlatformNav />
      </header>
      <main className="mx-auto max-w-5xl w-full flex-1">{children}</main>
    </div>
  );
}
