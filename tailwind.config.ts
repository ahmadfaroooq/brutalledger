import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        border: "var(--border)",
        "text-primary": "var(--text-primary)",
        "text-muted": "var(--text-muted)",
        lime: "#C8F135",
        crimson: "#BF2222",
        gold: "#A87820",
        teal: "#168080",
        sage: "#3A6840",
        plum: "#7A3880",
      },
      fontFamily: {
        display: ["var(--font-instrument)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        brutal: "4px 4px 0px var(--shadow-color)",
        "brutal-sm": "3px 3px 0px var(--shadow-color)",
        "brutal-hover": "6px 6px 0px var(--shadow-color)",
        "brutal-press": "1px 1px 0px var(--shadow-color)",
      },
      fontSize: {
        h1: ["64px", { lineHeight: "1.1", fontWeight: "700" }],
        h2: ["40px", { lineHeight: "1.15", fontWeight: "700" }],
        h3: ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        h4: ["20px", { lineHeight: "1.3", fontWeight: "700" }],
        body: ["15px", { lineHeight: "1.7" }],
      },
      letterSpacing: {
        label: "0.12em",
        button: "0.05em",
      },
    },
  },
  plugins: [],
};

export default config;
