import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});
import { Toaster } from "sonner";
import { CookieBanner } from "@/components/cookie-banner";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuxLane — Modeling agency OS",
  description:
    "An all-in-one operations platform for boutique and mid-size modeling agencies. Roster, board, jobs, holds, call sheets — all in one place.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  // Geist injects `--font-geist-sans` and `--font-geist-mono` via the
  // `.variable` classNames. We re-alias them to our generic `--font-sans` /
  // `--font-mono` hooks via CSS below so Tailwind's font-family theme resolves.
  return (
    <html
      lang={locale}
      className={`h-full ${GeistSans.variable} ${GeistMono.variable} ${playfair.variable}`}
    >
      <body
        className="min-h-full bg-paper text-ink antialiased font-sans"
        style={
          {
            "--font-sans": "var(--font-geist-sans)",
            "--font-mono": "var(--font-geist-mono)",
            "--font-serif": "var(--font-serif)",
          } as React.CSSProperties
        }
      >
        {children}
        <CookieBanner />
        <Toaster
          theme="dark"
          position="bottom-right"
          expand={false}
          richColors={false}
          toastOptions={{
            classNames: {
              toast:
                "!bg-paper-elevated !border !border-paper-border !text-ink !rounded-xl !shadow-2xl !font-sans",
              title: "!text-sm !font-medium",
              description: "!text-xs !text-ink-muted",
              actionButton: "!bg-ink !text-paper !text-xs !font-medium !rounded-md",
              cancelButton: "!bg-paper-border/60 !text-ink-muted !text-xs !rounded-md",
              success: "!border-board-confirmed/40",
              error: "!border-red-500/40",
            },
          }}
        />
      </body>
    </html>
  );
}
