import type { Metadata } from "next";
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
  return (
    <html lang={locale} className="h-full">
      <body className="min-h-full bg-paper text-ink antialiased font-sans">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
