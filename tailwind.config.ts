import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // LuxLane v2 palette — black canvas, white "ink", Vercel-style.
        //
        // We keep the `ink` / `paper` vocabulary from v1 so every existing
        // className keeps working, but their values are inverted:
        //   paper     = #000 canvas
        //   ink       = near-white text / foreground accents
        //   accent    = warm bronze, paler than v1 so it reads on black
        ink: {
          DEFAULT: "#EDEDED",
          muted: "#A1A1A1",
          subtle: "#666666",
        },
        paper: {
          DEFAULT: "#000000",
          elevated: "#0A0A0A",
          border: "#1F1F1F",
        },
        accent: {
          DEFAULT: "#D4A87A",
          soft: "#2A231B",
        },
        // Board status colors — rebalanced for a dark canvas. Same semantics
        // as before (available / option 3 / 2 / 1 / confirmed / on-job /
        // traveling / unavailable).
        board: {
          available: "#0A0A0A",
          option3: "#3F321A",
          option2: "#7A5E1E",
          option1: "#D4812B",
          confirmed: "#3FA36B",
          traveling: "#4A7FD6",
          onJob: "#D34A3A",
          unavailable: "#1F1F1F",
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
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        lg: "8px",
        xl: "10px",
        "2xl": "14px",
      },
    },
  },
  plugins: [],
};

export default config;
