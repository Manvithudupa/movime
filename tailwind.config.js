/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'Arial', 'sans-serif'],
        display: ['"Space Grotesk"', 'Arial', 'sans-serif'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        border: 'var(--border)',
        ring: 'var(--ring)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'slide-down': 'slide-down 0.5s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'loading-bar': 'loading-bar 2s ease-in-out infinite',
        'spin-reverse': 'spin-reverse 1s linear infinite',
      },
      keyframes: {
        float: {
          '0%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
          '100%': { transform: 'translateY(0px)' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'loading-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'spin-reverse': {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(167, 139, 250, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(167, 139, 250, 0.5)' },
          '100%': { boxShadow: '0 0 5px rgba(167, 139, 250, 0.3)' },
        },
      },
    },
  },
  plugins: [],
}
