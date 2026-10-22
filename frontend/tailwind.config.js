/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Platform brand: deep navy surfaces with a cyan accent.
        navy: {
          50: '#f2f6fb',
          100: '#e3eaf4',
          200: '#c3d1e6',
          300: '#94a9cd',
          400: '#5e7aae',
          500: '#3d5c93',
          600: '#2c4574',
          700: '#22355a',
          800: '#16233c',
          900: '#0b1220',
          950: '#070c16',
        },
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 18, 32, 0.06), 0 8px 24px -12px rgba(11, 18, 32, 0.18)',
        float: '0 18px 48px -20px rgba(11, 18, 32, 0.35)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out',
        'slide-up': 'slide-up .25s ease-out',
      },
    },
  },
  plugins: [],
};
