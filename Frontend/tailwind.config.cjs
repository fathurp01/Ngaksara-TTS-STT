/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ef4343',
        'background-light': '#f8f6f6',
        'background-dark': '#221010',
      },
      fontFamily: {
        display: ['Lexend', 'sans-serif'],
        sundanese: ['Noto Sans Sundanese', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
