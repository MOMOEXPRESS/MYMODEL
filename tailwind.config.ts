import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // LuxLane palette — editorial, neutral, confident.
        ink: {
          DEFAULT: "#0B0B0C",
          muted: "#54545A",
          subtle: "#8A8A92",
        },
        paper: {
          DEFAULT: "#FAFAF7",
          elevated: "#FFFFFF",
          border: "#E7E5DF",
        },
        accent: {
          DEFAULT: "#B8936A", // warm bronze
          soft: "#EFE4D4",
        },
        // Board status colors — from brief §9
        board: {
          available: "#FFFFFF",
          option3: "#FFF6D6",
          option2: "#FFE58A",
          option1: "#F5A623",
          confirmed: "#2E7D5B",
          traveling: "#3B6FB6",
          onJob: "#C0392B",
          unavailable: "#D9D5CC",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
        serif: ["ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"],
      },
      borderRadius: {
        lg: "10px",
        xl: "14px",
        "2xl": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
