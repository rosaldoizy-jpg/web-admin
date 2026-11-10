/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: 'var(--navy)',
          hover: 'var(--navy-hover)',
        },
        brand: {
          DEFAULT: 'var(--blue)',
          light: 'var(--blue)',
          soft: 'var(--blue-soft)',
          tint: 'var(--page)',
          tintstrong: 'var(--blue-soft)',
        },
        page: 'var(--page)',
        white: 'var(--white)',
        line: 'var(--border)',
        ink: {
          secondary: 'var(--text-muted)',
        },
        success: {
          DEFAULT: 'var(--success)',
          tint: 'var(--success-bg)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          tint: 'var(--warning-bg)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          tint: 'var(--danger-bg)',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
    },
  },
  plugins: [],
}
