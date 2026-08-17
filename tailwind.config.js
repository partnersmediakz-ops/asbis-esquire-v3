/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-fg)',
        paper: 'var(--color-bg)',
        'on-media': 'var(--color-on-media)',
      },
      fontFamily: {
        // Atkinson Hyperlegible создан Braille Institute для читателей с
        // ослабленным зрением: буквы различаются по форме, чтобы не
        // путались похожие пары. Для материала о доступности это выбор
        // по существу, а не оформление.
        sans: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '20px', frame: '40px' },
    },
  },
  plugins: [],
};
