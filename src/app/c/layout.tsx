import { requireClient } from "@/lib/auth-guards";
import { AppLogo } from "@/components/app-logo";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function ClientAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();

  return (
    <div className="min-h-screen bg-paper flex flex-col relative">
      <div aria-hidden className="ll-grain" />
      <header className="relative z-10 border-b border-paper-border bg-paper-elevated/90 sticky top-0">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <AppLogo href="/c" />
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-editorial text-ink-subtle hidden sm:inline">
              {user.displayName}
            </span>
            <Link href="/c/settings" className="ll-btn-ghost text-xs">
              Profile
            </Link>
            <LogoutButton className="ll-btn-ghost text-xs" />
          </div>
        </div>
        <nav className="mx-auto max-w-5xl px-6 flex gap-0 border-t border-paper-border">
          <NavLink href="/c">Home</NavLink>
          <NavLink href="/c/jobs">Bookings</NavLink>
          <NavLink href="/c/briefs">Briefs</NavLink>
          <NavLink href="/c/agencies">Agencies</NavLink>
          <NavLink href="/events">Events</NavLink>
          <NavLink href="/network">Network</NavLink>
        </nav>
      </header>
      <main className="relative z-10 mx-auto max-w-5xl w-full flex-1">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-3 text-sm font-medium text-ink-muted hover:text-ink",
        "border-b-2 border-transparent hover:border-editorial-warm/40 transition-colors",
      )}
    >
      {children}
    </Link>
  );
}
