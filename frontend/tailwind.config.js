/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy "blueprint" theme tokens (kept — still referenced by a
        // couple of print-oriented style names; no longer used for app UI).
        blueprint: {
          900: "#0A2E45",
          800: "#0F3A5F",
          700: "#164D78",
          600: "#1D5A8C",
          400: "#5B9BC7",
          100: "#DCEBF5",
        },
        paper: "#F4F1E8",
        graphite: "#26302E",
        amber: "#E8A33D",
        signal: {
          present: "#3D8B5F",
          absent: "#C1443D",
          late: "#E8A33D",
          excused: "#7C6FA8",
          upcoming: "#1D5A8C",
        },
        // --- Active dark glassmorphism theme ---
        navy: {
          DEFAULT: "#0F172A",
          card: "#1E293B",
          light: "#334155",
        },
        accent: {
          DEFAULT: "#38BDF8",
          dark: "#0EA5E9",
          soft: "#7DD3FC",
        },
      },
      boxShadow: {
        glow: "0 0 28px rgba(56, 189, 248, 0.35)",
        "glow-sm": "0 0 14px rgba(56, 189, 248, 0.28)",
        "glow-lg": "0 0 48px rgba(56, 189, 248, 0.45)",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        "blueprint-grid":
          "linear-gradient(rgba(91,155,199,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(91,155,199,0.15) 1px, transparent 1px)",
        "glow-radial":
          "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.18), transparent 60%)",
      },
      backgroundSize: {
        grid: "24px 24px",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.96)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.35s ease-out both",
        "pop": "pop 0.22s ease-in-out",
      },
    },
  },
  plugins: [],
}
