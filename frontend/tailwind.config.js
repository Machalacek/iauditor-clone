/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // ⬅️ REQUIRED for dark mode
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
