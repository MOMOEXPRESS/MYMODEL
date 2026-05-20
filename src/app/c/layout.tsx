import { requireClient } from "@/lib/auth-guards";
import { AppLogo } from "@/components/app-logo";
import { LogoutButton } from "@/components/logout-button";
import { PlatformNav } from "@/components/platform-nav";
import Link from "next/link";

export default async function ClientAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-paper-border bg-paper-elevated sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <AppLogo href="/c" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-subtle hidden sm:inline">{user.displayName}</span>
            <Link href="/c/settings" className="ll-btn-ghost text-xs">
              Profile
            </Link>
            <LogoutButton className="ll-btn-ghost text-xs" />
          </div>
        </div>
        <nav className="mx-auto max-w-5xl px-6 flex gap-1 border-t border-paper-border">
          <NavLink href="/c">Home</NavLink>
          <NavLink href="/c/jobs">Bookings</NavLink>
          <NavLink href="/c/briefs">Briefs</NavLink>
          <NavLink href="/c/agencies">Agencies</NavLink>
          <NavLink href="/events">Events</NavLink>
        </nav>
        <PlatformNav />
      </header>
      <main className="mx-auto max-w-5xl w-full flex-1">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2.5 text-sm font-medium text-ink-muted hover:text-ink border-b-2 border-transparent hover:border-paper-border"
    >
      {children}
    </Link>
  );
}
