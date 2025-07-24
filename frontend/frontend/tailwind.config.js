/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",  // ← scans all your React files
    "./public/index.html"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
