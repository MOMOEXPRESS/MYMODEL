import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "../marketing.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LuxLane — The runway behind the runway",
  description:
    "Where fashion bookings stay alive: holds, confirmations, castings, and the people around them.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className={playfair.variable}>{children}</div>;
}
