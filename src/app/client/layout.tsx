import { AppLogo } from "@/components/app-logo";

/** Shared chrome for brand/client magic-link portal (no agency login). */
export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-paper-border bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <AppLogo href="/" showWordmark />
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
            Client portal
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl">{children}</div>
    </div>
  );
}
