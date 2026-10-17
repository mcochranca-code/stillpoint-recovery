import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: '#245444',
        deep: '#153D35',
        sage: '#7FA58A',
        'pale-sage': '#DCE9DC',
        cream: '#F7F4EA',
        paper: '#FFFEFA',
        gold: '#C79A43',
        sky: '#4B91C5',
        ink: '#193C35',
        muted: '#62766F',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'ui-serif', 'serif'],
      },
      boxShadow: {
        card: '0 8px 28px rgba(27, 62, 52, 0.08)',
      },
      borderRadius: {
        card: '18px',
      },
    },
  },
  plugins: [],
} satisfies Config;
