import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 bg-ink text-paper">
        <Link href="/" className="font-serif text-xl">LuxLane</Link>
        <div>
          <p className="font-serif text-4xl leading-tight max-w-md">
            &ldquo;Finally — a tool built for how an agency actually works.&rdquo;
          </p>
          <p className="mt-4 text-sm opacity-70">— Every booker we&apos;ve ever met</p>
        </div>
        <p className="text-xs opacity-60">&copy; {new Date().getFullYear()} LuxLane</p>
      </div>
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
