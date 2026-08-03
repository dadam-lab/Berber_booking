/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--bg-color, #020617)',
          primary: 'var(--primary-color, #0f172a)',
          secondary: 'var(--secondary-color, #d97706)',
          card: 'var(--card-bg, #0f172a)',
          text: 'var(--text-color, #f8fafc)',
          accent: 'var(--accent-color, #f59e0b)',
        },
      },
    },
  },
  plugins: [],
};
