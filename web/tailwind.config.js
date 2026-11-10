/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // sampled from дом-мичурин.рф
        brand: { DEFAULT: '#26372D', deep: '#1B2820', plan: '#425A4C' },
        sage: { DEFAULT: '#CBDFA2', soft: '#E2EDDE' },
        taupe: '#9F7E64',
        ink: '#1F2E25',
        paper: '#F3F3F1',
        sky: { top: '#4F86C6', low: '#CFDDE7' },
      },
      fontFamily: {
        display: ['"Prata"', 'Georgia', 'serif'],
        sans: ['"Nunito"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { caps: '0.08em' },
      borderRadius: { leaf: '2.75rem' },
    },
  },
  plugins: [],
}
