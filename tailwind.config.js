/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Sans-serif']
      },
      textColor: {
        primary: '#282828',
        placeholder: '#747474'
      },
      colors: {
        primary: '#282828',
        lighter: '#EFEEEE',
        light: '#DFDFDF',
        'light-dim': '#E9E9E8',
        success: '#10B981',
        danger: '#ef467e'
      }
    }
  },
  plugins: []
}
