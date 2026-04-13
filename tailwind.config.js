/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      screens: {
        '2xl': '1536px',
      },
      colors: {
        'custom-gray': '#21313c',
        'custom-light': '#f0f3f2',
        'custom-green': '#11ab11',
        'custom-dark-green': '#0d790d',
        'custom-red': '#dc2626',
        'custom-dark-red': '#b91c1c',
        'custom-visa': '#2100C4',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1rem',
          md: '2rem',
          lg: '4rem',
          xl: '6rem',
          '2xl': '12rem',
        },
      },
      backgroundImage: {
        'custom-gradient': 'linear-gradient(to right,#0d790d 0%, #11ab11 50%, #0d790d 100%)',
      },
      boxShadow: {
        'custom-main': '0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08)',
        'custom-green': '0px 0px 2px 2px #11ab1173',
      },
    },
  },
  plugins: [],
};
