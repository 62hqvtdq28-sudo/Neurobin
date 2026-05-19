// tailwind.config.js — extracted from admin.html
// This file replaces the inline <script> block that required CSP unsafe-inline.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F6F7F4',
          100: '#E8EAD8',
          200: '#D1D5B1',
          300: '#AABF89',
          400: '#83A962',
          500: '#5C933B',
          600: '#3D6B2D',
          700: '#2D5016',
          800: '#254012',
          900: '#1E350F',
        },
        cream: '#FDFCF8',
        gold: '#F59E0B',
      },
      fontFamily: { heading: ['Cairo', 'sans-serif'] }
    }
  }
}
