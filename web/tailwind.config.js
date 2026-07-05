/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#10B981', // Verde estilo WhatsApp/SaaS moderno
          600: '#059669',
        }
      }
    },
  },
  plugins: [],
}