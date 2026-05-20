import { requireAgencyStaff } from "@/lib/auth-guards";
import { AgencyNav } from "@/components/agency-nav";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { PageTransition } from "@/components/page-transition";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CommandPalette } from "@/components/command-palette";
import { CommandKHint } from "@/components/command-k-hint";
import { AppLogo } from "@/components/app-logo";
import { getLocale } from "@/lib/i18n";
import { initials } from "@/lib/utils";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAgencyStaff();
  const locale = await getLocale();
  const roleLabel =
    user.agencyMembership?.role === "OWNER"
      ? "Owner"
      : user.agencyMembership?.role === "BOOKER"
        ? "Booker"
        : user.agencyMembership?.role === "PRODUCTION"
          ? "Production"
          : user.agencyMembership?.role === "ACCOUNTS"
            ? "Accounts"
            : "Staff";

  return (
    <div className="min-h-screen flex bg-paper relative">
      <div aria-hidden className="ll-grain" />
      <aside className="relative z-10 w-[260px] shrink-0 flex flex-col border-r border-paper-border bg-paper-elevated/95">
        <div className="h-14 px-4 flex items-center justify-between border-b border-paper-border">
          <AppLogo href="/agency" />
          <NotificationBell />
        </div>

        <div className="px-4 py-4 border-b border-paper-border">
          <p className="text-sm font-semibold truncate text-ink">{user.agency.name}</p>
          <p className="text-xs text-ink-subtle mt-0.5 truncate">
            {user.agency.city ?? "Agency"} · Code {user.agency.signupCode}
          </p>
        </div>

        <CommandKHint />
        <AgencyNav role={user.agencyMembership?.role ?? null} />

        <div className="mt-auto p-3 border-t border-paper-border">
          <div className="flex items-center gap-3 rounded-xl bg-paper-muted border border-paper-border p-3">
            <div className="w-9 h-9 rounded-full bg-paper-muted text-editorial-warm text-xs font-semibold flex items-center justify-center ring-1 ring-paper-border">
              {initials(user.displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-xs text-ink-subtle">{roleLabel}</p>
            </div>
          </div>
          <LogoutButton className="mt-2 w-full ll-btn-ghost text-xs justify-start h-9" />
          <div className="mt-2 flex justify-end">
            <LocaleSwitcher current={locale} />
          </div>
        </div>
      </aside>

      <main className="relative z-10 flex-1 min-w-0 flex flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-glow-radial opacity-60" />
        <PageTransition>{children}</PageTransition>
      </main>
      <CommandPalette />
    </div>
  );
}
