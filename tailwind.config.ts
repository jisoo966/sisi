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
      },
      fontFamily: {
        fraunces: ["var(--font-fraunces)", "serif"],
        garamond: ["var(--font-eb-garamond)", "serif"],
        caveat: ["var(--font-caveat)", "cursive"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
