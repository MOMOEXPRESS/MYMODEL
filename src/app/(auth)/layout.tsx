import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-paper">
      {/* Left: quiet editorial panel with a soft accent glow */}
      <div className="hidden md:flex relative flex-col justify-between p-10 border-r border-paper-border overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-grid opacity-60" />
        <div
          aria-hidden
          className="absolute -bottom-24 -right-24 w-[480px] h-[480px] rounded-full bg-accent/10 blur-3xl pointer-events-none"
        />
        <Link href="/" className="relative font-serif text-xl tracking-tight">
          LuxLane
        </Link>
        <div className="relative">
          <p className="font-serif text-4xl leading-[1.1] max-w-md text-ink">
            &ldquo;Finally — a tool built for how an agency actually works.&rdquo;
          </p>
          <p className="mt-4 text-sm text-ink-muted">— Every booker we&apos;ve ever met</p>
        </div>
        <p className="relative text-xs text-ink-subtle">
          &copy; {new Date().getFullYear()} LuxLane
        </p>
      </div>
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
