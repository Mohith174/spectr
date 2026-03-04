import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background layers
        bg: "#080808",
        surface: "#0f0f0f",
        raised: "#141414",
        // Borders
        border: "#252525",
        "border-bright": "#383838",
        // Text scale
        primary: "#f0f0f0",
        sub: "#a0a0a0",
        muted: "#555555",
        dim: "#333333",
        // Functional only — no decorative color
        danger: "#cc2222",
        caution: "#998800",
        safe: "#2a7a2a",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Menlo", "Consolas", "monospace"],
      },
      animation: {
        "blink": "blink 1.2s step-end infinite",
        "spin-slow": "spin 3s linear infinite",
        "fade-in": "fadeIn 0.15s ease-out",
        "scan": "scanDown 8s linear infinite",
      },
      keyframes: {
        blink: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scanDown: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
