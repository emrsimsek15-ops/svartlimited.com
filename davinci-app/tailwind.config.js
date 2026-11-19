/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '640px', md: '820px', lg: '1024px', xl: '1180px', '2xl': '1440px' },
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        surface2: v('surface-2'),
        surface3: v('surface-3'),
        line: v('line'),
        text: v('text'),
        muted: v('muted'),
        faint: v('faint'),
        accent: v('accent'),
        accentStrong: v('accent-strong'),
        profit: v('profit'),
        loss: v('loss'),
        warn: v('warn'),
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
      borderRadius: { card: '14px', ctl: '10px' },
      transitionTimingFunction: { out: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
};
