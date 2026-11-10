/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#203A32', deep: '#12241E', soft: '#4E6B57' },
        ink: '#101513',
        paper: '#F3F1EC',
        clay: '#ECE9E4',
        sky: { top: '#4F86C6', low: '#CFDDE7' },
        facade: { top: '#6E737A', mid: '#E3E5E7', base: '#4B4240' },
        terracotta: '#C2704F',
      },
      fontFamily: {
        display: ['"Unbounded"', 'system-ui', 'sans-serif'],
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      letterSpacing: { caps: '0.16em' },
    },
  },
  plugins: [],
}
