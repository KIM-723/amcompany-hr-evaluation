import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { navy: { 950:'#0b1739',900:'#12234d',800:'#183166' } } } },
  plugins: []
} satisfies Config;
