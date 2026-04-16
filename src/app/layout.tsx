import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
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
      className={`h-full ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body
        className="min-h-full bg-paper text-ink antialiased font-sans"
        style={
          {
            "--font-sans": "var(--font-geist-sans)",
            "--font-mono": "var(--font-geist-mono)",
          } as React.CSSProperties
        }
      >
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
