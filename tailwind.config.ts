import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        paper: "#fbfaf7",
        matcha: "#5f7f52",
        sumi: "#2f3a35",
        sakura: "#d76f86"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(23, 32, 27, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
