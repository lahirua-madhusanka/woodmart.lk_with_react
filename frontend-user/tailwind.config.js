/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "../src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#0959a4",
        "brand-dark": "#083f77",
        "brand-light": "#c9e2ff",
        accent: "#f5c95a",
        ink: "#0f172a",
        muted: "#64748b",
      },
      boxShadow: {
        premium: "0 20px 45px -25px rgba(15, 23, 42, 0.35)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
