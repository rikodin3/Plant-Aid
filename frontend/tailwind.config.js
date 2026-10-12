/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          50: '#f0f9f9',
          100: '#D9F2F2',
          200: '#A6D9D9',
          300: '#8ecece',
          400: '#75BDBD',
          500: '#4fa2a2',
          600: '#2D8686',
          700: '#1e6e6e',
          800: '#0F5757',
          900: '#0b4242',
          950: '#062b2b',
        },
        emerald: {
          50: '#f0f9f9',
          100: '#D9F2F2',
          200: '#A6D9D9',
          300: '#8ecece',
          400: '#75BDBD',
          500: '#4fa2a2',
          600: '#2D8686',
          700: '#1e6e6e',
          800: '#0F5757',
          900: '#0b4242',
          950: '#062b2b',
        },
        soil: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          500: '#eab308',
          700: '#a16207',
          900: '#713f12',
        },
        harvest: {
          500: '#d97706',
          600: '#b45309',
        }
      },
      fontFamily: {
        sans: ['Gilroy', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Gilroy', 'Georgia', 'serif'],
        gilroy: ['Gilroy', 'sans-serif'],
        cursive: ['"Dancing Script"', 'cursive'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'field': '0 4px 20px -2px rgba(15, 87, 87, 0.08), 0 2px 6px -1px rgba(15, 87, 87, 0.04)',
        'elevated': '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
      }
    },
  },
  plugins: [],
}
