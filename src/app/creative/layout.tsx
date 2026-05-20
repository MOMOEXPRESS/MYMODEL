import { requireCreative } from "@/lib/auth-guards";
import { AppLogo } from "@/components/app-logo";
import { LogoutButton } from "@/components/logout-button";
import { PlatformNav } from "@/components/platform-nav";
import Link from "next/link";

const NAV = [
  { href: "/creative", label: "Home" },
  { href: "/creative/settings", label: "Profile" },
  { href: "/events", label: "Events" },
];

export default async function CreativeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCreative();

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-paper-border bg-paper-elevated sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <AppLogo href="/creative" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-subtle hidden sm:inline">{user.displayName}</span>
            <LogoutButton className="ll-btn-ghost text-xs" />
          </div>
        </div>
        <nav className="mx-auto max-w-5xl px-6 flex gap-1 border-t border-paper-border">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="px-3 py-2.5 text-sm font-medium text-ink-muted hover:text-ink border-b-2 border-transparent hover:border-paper-border"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <PlatformNav />
      </header>
      <main className="mx-auto max-w-5xl w-full flex-1">{children}</main>
    </div>
  );
}
