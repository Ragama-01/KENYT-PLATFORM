import type { Config } from "tailwindcss";

// ---------------------------------------------------------------------------
// Design tokens
// A shipping-manifest identity: deep navy + a single disciplined gold accent,
// warm paper background instead of stark white, mono type reserved for
// reference numbers (BOL, registrations, IDs) to signal "tracked record".
// ---------------------------------------------------------------------------
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0A162E", // deepest — app shell / sidebar bg
          900: "#0E1E38",
          800: "#122544", // primary navy — panels, header
          700: "#173156",
          600: "#1D3A66", // borders/dividers on navy surfaces
          400: "#3E5A8C", // muted text on navy
        },
        gold: {
          500: "#C9A227", // primary accent — CTAs, active states, focus
          400: "#D9B84A",
          300: "#E4C766", // hover / light accent
          100: "#F3E9C8",
        },
        paper: "#F6F5F1", // warm off-white — form/content background
        ink: {
          DEFAULT: "#1B2333",
          muted: "#5B6473",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        // subtle dotted route-line texture reused across login + sidebar
        "route-line":
          "repeating-linear-gradient(90deg, rgba(201,162,39,0.35) 0, rgba(201,162,39,0.35) 6px, transparent 6px, transparent 16px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
