/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#FAF8F4',
          viewer: '#2B2B2B',
        },
        accent: {
          primary: '#C2603A',
          secondary: '#4A7CA5',
        },
        ink: {
          primary: '#1C1C1E',
          muted: '#999999',
        },
        surface: { card: '#FFFFFF' },
        border: { subtle: '#E5E0D8' },
      },
      fontFamily: {
        display: ['"New York"', 'Noto Serif', 'Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Roboto', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'screen-x': '20px',
        'thumb-strip': '100px',
        'btn-h': '52px',
      },
      borderRadius: { card: '12px' },
    },
  },
  plugins: [],
};
