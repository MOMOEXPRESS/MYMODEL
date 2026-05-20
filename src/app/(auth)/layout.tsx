import "../marketing.css";
import { Playfair_Display } from "next/font/google";
import { AuthShell } from "@/components/marketing/auth-shell";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={playfair.variable}>
      <AuthShell>{children}</AuthShell>
    </div>
  );
}
