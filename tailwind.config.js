/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pickle: {
          50: '#f6fae9',
          100: '#ebf5cd',
          200: '#d9ec9f',
          300: '#c0df67',
          400: '#a7cf37',
          500: '#8bb41f',
          600: '#6d9015',
          700: '#536f14',
          800: '#435815',
          900: '#394b16',
          950: '#1d2a07',
        },
        court: {
          gold: '#f59e0b',
          blue: '#2563eb',
          green: '#10b981',
          purple: '#8b5cf6',
          slate: '#475569'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
