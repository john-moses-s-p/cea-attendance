/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        blueprint: {
          900: "#0A2E45", // deepest ink
          800: "#0F3A5F", // primary panel
          700: "#164D78", // hover/active
          600: "#1D5A8C", // accent blue
          400: "#5B9BC7", // muted accent / lines
          100: "#DCEBF5", // pale wash
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
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        "blueprint-grid":
          "linear-gradient(rgba(91,155,199,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(91,155,199,0.15) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "24px 24px",
      },
    },
  },
  plugins: [],
}
