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
        background: "#05070e",
        surface: "#0b0f19",
        "surface-card": "#111726",
        "surface-border": "#1e293b",
        primary: {
          DEFAULT: "#06b6d4", // cyan-500
          dark: "#0891b2",
          light: "#22d3ee",
          glow: "rgba(6, 182, 212, 0.35)",
        },
        partner: {
          DEFAULT: "#a855f7", // purple-500
          dark: "#7e22ce",
          light: "#c084fc",
          glow: "rgba(168, 85, 247, 0.35)",
        },
        accent: {
          emerald: "#10b981",
          purple: "#a855f7",
          amber: "#f59e0b",
          rose: "#f43f5e",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)",
        "cyan-glow": "radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)",
        "purple-glow": "radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "wave-bar": "wave 1.2s ease-in-out infinite",
        "radar-sweep": "radar 4s linear infinite",
        "shimmer": "shimmer 2.5s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        wave: {
          "0%, 100%": { height: "6px" },
          "50%": { height: "32px" },
        },
        radar: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.8", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.02)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
