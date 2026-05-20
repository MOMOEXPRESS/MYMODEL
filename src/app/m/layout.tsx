import { requireModel } from "@/lib/auth-guards";
import { ModelNav } from "@/components/model-nav";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { PageTransition } from "@/components/page-transition";
import { AppLogo } from "@/components/app-logo";
import { PlatformNav } from "@/components/platform-nav";
import { initials } from "@/lib/utils";

export default async function ModelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireModel();

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="sticky top-0 z-20 border-b border-paper-border bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <AppLogo href="/m" />
          <div className="flex items-center gap-3">
            <NotificationBell side="right" />
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-paper-border">
              <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-semibold flex items-center justify-center">
                {initials(user.displayName)}
              </div>
              <div className="text-sm leading-tight">
                <p className="font-medium">{user.displayName}</p>
                <p className="text-xs text-ink-subtle">{user.agency?.name}</p>
              </div>
            </div>
            <LogoutButton className="ll-btn-ghost text-xs h-9 px-3" />
          </div>
        </div>
        <ModelNav />
        <PlatformNav />
      </header>

      <main className="mx-auto max-w-3xl w-full px-4 py-8 flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
