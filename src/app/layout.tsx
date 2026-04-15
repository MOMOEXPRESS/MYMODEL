import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuxLane — Modeling agency OS",
  description:
    "An all-in-one operations platform for boutique and mid-size modeling agencies. Roster, board, jobs, holds, call sheets — all in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-paper text-ink antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
