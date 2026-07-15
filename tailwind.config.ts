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
        cream: {
          DEFAULT: "#F5EFE6",
          off: "#FAF6F0",
        },
        plum: {
          DEFAULT: "#3D2E25",
        },
        brown: {
          warm: "#6B5648",
          dark: "#3A302A",
        },
        gold: {
          mustard: "#D4A82A",
        },
        rose: {
          dusty: "#C4847C",
          coral: "#D89789",
        },
        sage: "#8FA38C",
        lavender: "#D4C8F0",
        // Brand v2 / Journey palette (locked from Figma)
        journey: {
          cream: "#F2E5B5",     // butter cream sky in scenes
          ice: "#B5D5E8",       // icy pale blue
          cobalt: "#3B5BB8",    // deep cobalt
          navy: "#1F2A44",      // primary text dark
          oxblood: "#7A2E2E",   // oxblood emphasis
          purple: "#B19CD9",    // primary button (lavender purple)
          frost: "#E8F0F8",     // soft frosted card bg
        },
      },
      fontFamily: {
        fraunces: ["var(--font-fraunces)", "serif"],
        garamond: ["var(--font-eb-garamond)", "serif"],
        caveat: ["var(--font-caveat)", "cursive"],
        // Brand v2 lock: Sentient (Fontshare) for headings, Inter for body
        sentient: ["Sentient", "var(--font-fraunces)", "serif"],
        inter: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      letterSpacing: {
        // brand v2 — all Sentient text uses -0.03em by default
        sentient: "-0.03em",
      },
      // Mobile viewport lock — svh accounts for iOS Safari URL bar
      height: {
        svh: "100svh",
        dvh: "100dvh",
      },
      minHeight: {
        svh: "100svh",
        dvh: "100dvh",
      },
    },
  },
  plugins: [],
};
export default config;
