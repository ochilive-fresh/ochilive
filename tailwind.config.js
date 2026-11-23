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
          bg: '#000000',
          surface: '#1c1c1e',
          accent: '#1c1c1e',
          muted: '#a4a5ad',
          text: '#f4f1eb',
          accentSoft: '#d8f57e',
        },
      },
    },
  },
  plugins: [],
}
