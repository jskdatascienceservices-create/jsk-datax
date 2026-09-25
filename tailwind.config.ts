import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F1624",
          2: "#1E2D4A",
        },
        saffron: {
          DEFAULT: "#E8820C",
          light: "#FEF3E2",
        },
        indigo: {
          DEFAULT: "#1A3FCC",
          light: "#EEF2FF",
        },
        surface: "#F8FAFC",
        border: "#E2E8F0",
        muted: "#64748B",
        dim: "#94A3B8",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;