import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-paper-border">
        <div className="mx-auto max-w-3xl px-6 h-14 flex items-center">
          <Link href="/" className="font-serif text-lg tracking-tight">
            LuxLane
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 prose prose-sm prose-stone">
        {children}
      </main>
      <footer className="border-t border-paper-border mt-12">
        <div className="mx-auto max-w-3xl px-6 h-14 flex items-center justify-between text-xs text-ink-subtle">
          <Link href="/">&larr; Home</Link>
          <span>&copy; {new Date().getFullYear()} LuxLane</span>
        </div>
      </footer>
    </div>
  );
}
