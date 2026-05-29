/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'stone-green': '#00461e',
        'stone-green-dark': '#003015',
        'stone-green-light': '#f5fff5',
        'stone-accent': '#00d700',
        'stone-border': '#c8d2c8',
        'stone-muted': '#505a50',
        stone: { 600: '#00461e', 700: '#003015', 800: '#001f0e' },
      },
      fontFamily: {
        sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
