/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      spacing: {
        18: "4.5rem"
      },
      colors: {
        wish: {
          blue: "#2563eb",
          soft: "#e0f2fe",
          gold: "#f7c948"
        }
      }
    }
  },
  plugins: []
};

