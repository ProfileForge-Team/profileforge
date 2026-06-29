/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        aqua: '0 0 0 1px rgba(34, 211, 238, 0.15), 0 18px 60px rgba(6, 182, 212, 0.12)'
      },
      colors: {
        ink: '#070b14',
        panel: '#0e1727',
        aqua: '#22d3ee'
      }
    }
  },
  plugins: []
};
