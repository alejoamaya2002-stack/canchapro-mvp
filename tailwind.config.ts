import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        field: {
          50: "#f7fbf7",
          100: "#e8f7ec",
          700: "#16a34a",
          800: "#0f2a1b",
          900: "#050806"
        },
        line: "#d8e4da"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(20, 32, 26, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
