import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#F4F1EC",
          muted: "#A39E96",
          subtle: "#6B6560",
        },
        paper: {
          DEFAULT: "#0C0C0B",
          elevated: "#141413",
          hover: "#1A1A18",
          border: "#2A2A26",
          muted: "#181816",
        },
        accent: {
          DEFAULT: "#3B82F6",
          hover: "#60A5FA",
          soft: "rgba(59, 130, 246, 0.1)",
          ring: "rgba(59, 130, 246, 0.32)",
        },
        editorial: {
          cream: "#F4F1EC",
          warm: "#D4C4A8",
          rose: "#C9A8A0",
          line: "rgba(244, 241, 236, 0.08)",
        },
        success: { DEFAULT: "#22C55E", soft: "rgba(34, 197, 94, 0.12)" },
        warning: { DEFAULT: "#F59E0B", soft: "rgba(245, 158, 11, 0.12)" },
        danger: { DEFAULT: "#EF4444", soft: "rgba(239, 68, 68, 0.12)" },
        board: {
          available: "#0C0C0B",
          option3: "#1a1508",
          option2: "#3d2e0a",
          option1: "#b45309",
          confirmed: "#14532d",
          traveling: "#1e3a5f",
          onJob: "#7f1d1d",
          unavailable: "#181816",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        serif: [
          "var(--font-serif)",
          "ui-serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "Menlo", "monospace"],
      },
      fontSize: {
        "display-sm": ["2.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        display: ["3.25rem", { lineHeight: "1.02", letterSpacing: "-0.035em" }],
        "display-lg": ["4.5rem", { lineHeight: "1", letterSpacing: "-0.04em" }],
      },
      letterSpacing: {
        editorial: "0.28em",
        caps: "0.2em",
      },
      borderRadius: {
        lg: "10px",
        xl: "12px",
        "2xl": "14px",
        "3xl": "18px",
      },
      boxShadow: {
        card: "0 0 0 1px rgba(255,255,255,0.05), 0 12px 40px rgba(0,0,0,0.35)",
        "card-hover": "0 0 0 1px rgba(255,255,255,0.08), 0 20px 48px rgba(0,0,0,0.4)",
        glow: "0 0 48px rgba(212, 196, 168, 0.08)",
        "glow-accent": "0 0 40px rgba(59, 130, 246, 0.12)",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        editorial: "420ms",
      },
    },
  },
  plugins: [],
};

export default config;
