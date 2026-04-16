import Link from "next/link";
import { requireModel } from "@/lib/auth-guards";
import { ModelNav } from "@/components/model-nav";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { PageTransition } from "@/components/page-transition";
import { initials } from "@/lib/utils";

export default async function ModelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireModel();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-paper-border bg-paper-elevated">
        <div className="mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          <Link href="/m" className="font-serif text-lg tracking-tight">
            LuxLane
          </Link>
          <div className="flex items-center gap-4">
            <NotificationBell side="right" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-medium flex items-center justify-center">
                {initials(user.displayName)}
              </div>
              <div className="hidden sm:block text-sm">
                <div className="font-medium leading-tight">{user.displayName}</div>
                <div className="text-xs text-ink-subtle">{user.agency?.name ?? ""}</div>
              </div>
            </div>
            <LogoutButton className="ll-btn-ghost text-xs" />
          </div>
        </div>
        <ModelNav />
      </header>

      <main className="mx-auto max-w-4xl w-full px-6 py-8 flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
