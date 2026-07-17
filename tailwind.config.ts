import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        paper: "#fbfaf7",
        matcha: "#2e7d64",
        bamboo: "#5ba189",
        sumi: "#2f3a35",
        sakura: "#d76f86"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(23, 32, 27, 0.08)"
      },
      ringColor: {
        DEFAULT: "rgba(46, 125, 100, 0.4)"
      },
      transitionDuration: {
        "150": "150ms",
        "250": "250ms"
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        softPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" }
        }
      },
      animation: {
        fadeIn: "fadeIn 300ms ease-out",
        slideUp: "slideUp 300ms ease-out",
        slideDown: "slideDown 300ms ease-out",
        softPulse: "softPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      }
    }
  },
  plugins: []
};

export default config;
