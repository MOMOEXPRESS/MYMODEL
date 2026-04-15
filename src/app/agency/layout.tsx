import Link from "next/link";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { AgencyNav } from "@/components/agency-nav";
import { LogoutButton } from "@/components/logout-button";
import { initials } from "@/lib/utils";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAgencyStaff();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-paper-border bg-paper-elevated flex flex-col">
        <div className="px-5 h-16 flex items-center border-b border-paper-border">
          <Link href="/agency" className="font-serif text-lg tracking-tight">
            LuxLane
          </Link>
        </div>

        <div className="px-4 py-4">
          <div className="text-xs uppercase tracking-wider text-ink-subtle">Agency</div>
          <div className="text-sm font-medium mt-1 truncate">{user.agency.name}</div>
          <div className="text-xs text-ink-muted mt-0.5">
            {user.agency.city ? `${user.agency.city} · ` : ""}Code {user.agency.signupCode}
          </div>
        </div>

        <AgencyNav />

        <div className="mt-auto p-4 border-t border-paper-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-medium flex items-center justify-center">
              {initials(user.displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user.displayName}</div>
              <div className="text-xs text-ink-subtle truncate">
                {user.agencyMembership?.role.toLowerCase() ?? "staff"}
              </div>
            </div>
          </div>
          <LogoutButton className="mt-3 w-full ll-btn-ghost text-xs justify-start" />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
