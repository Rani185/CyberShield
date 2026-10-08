/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:    '#0a0f1e',
        surface: '#0d1424',
        subtle:  '#1e2d45',
        sidebar: '#060b16',
        'accent-cyan':  '#00d4ff',
        'accent-blue':  '#3b82f6',
        'text-primary': '#e2e8f0',
        'text-muted':   '#8892a4',
        critical: '#ef4444',
        high:     '#f97316',
        medium:   '#eab308',
        low:      '#22c55e',
        info:     '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
