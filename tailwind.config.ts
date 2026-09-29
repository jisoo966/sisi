import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Sísí — five core colours (design-system/tokens.css). Legacy names
      // resolve to the same five so older pages share one palette.
      colors: {
        ink: "rgb(var(--sisi-ink-rgb) / <alpha-value>)",
        paper: "rgb(var(--sisi-paper-rgb) / <alpha-value>)",
        "sisi-blue": "rgb(var(--sisi-blue-rgb) / <alpha-value>)",
        star: "rgb(var(--sisi-gold-rgb) / <alpha-value>)",
        coral: "rgb(var(--sisi-coral-rgb) / <alpha-value>)",
        cream: { DEFAULT: "rgb(var(--sisi-paper-rgb) / <alpha-value>)", off: "rgb(var(--sisi-paper-rgb) / <alpha-value>)" },
        plum: { DEFAULT: "rgb(var(--sisi-ink-rgb) / <alpha-value>)" },
        brown: { warm: "rgb(var(--sisi-ink-rgb) / 0.8)", dark: "rgb(var(--sisi-ink-rgb) / <alpha-value>)" },
        gold: { DEFAULT: "rgb(var(--sisi-gold-rgb) / <alpha-value>)", mustard: "rgb(var(--sisi-gold-rgb) / <alpha-value>)" },
        rose: { dusty: "rgb(var(--sisi-coral-rgb) / <alpha-value>)", coral: "rgb(var(--sisi-coral-rgb) / <alpha-value>)" },
        sage: "rgb(var(--sisi-ink-rgb) / 0.6)",
        lavender: "rgb(var(--sisi-blue-rgb) / 0.6)",
        journey: {
          cream: "rgb(var(--sisi-paper-rgb) / <alpha-value>)",
          ice: "rgb(var(--sisi-blue-rgb) / 0.6)",
          cobalt: "rgb(var(--sisi-blue-rgb) / <alpha-value>)",
          navy: "rgb(var(--sisi-ink-rgb) / <alpha-value>)",
          oxblood: "rgb(var(--sisi-coral-rgb) / <alpha-value>)",
          purple: "rgb(var(--sisi-blue-rgb) / <alpha-value>)",
          frost: "rgb(var(--sisi-paper-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        // Two families only: Sentient (editorial) and Inter (functional UI)
        editorial: ["var(--font-editorial)"],
        ui: ["var(--font-ui)"],
        sentient: ["var(--font-editorial)"],
        fraunces: ["var(--font-editorial)"],
        garamond: ["var(--font-editorial)"],
        caveat: ["var(--font-editorial)"],
        inter: ["var(--font-ui)"],
        serif: ["var(--font-editorial)"],
        sans: ["var(--font-ui)"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      letterSpacing: {
        // brand v2 — all Sentient text uses -0.03em by default
        sentient: "-0.01em",
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
