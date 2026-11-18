/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ochi: {
          bg: '#0b0c10',
          surface: '#15171d',
          accent: '#b9412e',
          muted: '#a4a5ad',
          text: '#f4f1eb',
          accentSoft: '#ffab98',
        },
      },
    },
  },
  plugins: [],
}
