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
        background: "#080b11",
        surface: "#101622",
        "surface-card": "#161e2e",
        "surface-border": "#212d45",
        primary: {
          DEFAULT: "#06b6d4", // cyan-500
          dark: "#0891b2",
          light: "#22d3ee",
          glow: "rgba(6, 182, 212, 0.25)",
        },
        accent: {
          emerald: "#10b981",
          purple: "#a855f7",
          amber: "#f59e0b",
          rose: "#f43f5e",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "wave-bar": "wave 1.2s ease-in-out infinite",
      },
      keyframes: {
        wave: {
          "0%, 100%": { height: "6px" },
          "50%": { height: "32px" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
