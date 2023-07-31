/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Sans-serif']
      },
      textColor: {
        primary: '#282828'
      }
    }
  },
  plugins: []
}
