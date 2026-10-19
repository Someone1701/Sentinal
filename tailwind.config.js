/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './map.html',
    './landing.html',
    './src/**/*.{js,ts,jsx,tsx,html,css}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sentinel: {
          void: '#050811',
          subtle: '#080d1a',
          surface: 'rgba(13, 22, 38, 0.72)',
          'surface-hover': 'rgba(18, 30, 52, 0.85)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-glow': 'rgba(34, 211, 238, 0.35)',
          cyan: '#22d3ee',
          indigo: '#6366f1',
          blue: '#38bdf8',
          emerald: '#10b981',
          amber: '#f59e0b',
          crimson: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
      },
      animation: {
        'pulse-slow': 'lpPulse 2.5s infinite ease-in-out',
        'glow-spin': 'glowSpin 12s linear infinite',
      },
      keyframes: {
        lpPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.85)' },
        },
        glowSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
