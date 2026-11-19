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
          accent: '#c5e84c',
          muted: '#a4a5ad',
          text: '#f4f1eb',
          accentSoft: '#d8f57e',
        },
      },
    },
  },
  plugins: [],
}
