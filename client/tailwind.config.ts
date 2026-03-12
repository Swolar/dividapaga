import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0b1e',
          secondary: '#111234',
          glass: 'rgba(17, 18, 52, 0.7)',
        },
        border: {
          glass: 'rgba(255, 255, 255, 0.08)',
        },
        neon: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
        },
        accent: {
          amber: '#f59e0b',
          orange: '#f97316',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'glass': '24px',
        'card': '16px',
      },
      boxShadow: {
        'sm-dark': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'md-dark': '0 4px 16px rgba(0, 0, 0, 0.4)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-accent': '0 0 20px rgba(249, 115, 22, 0.3)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        'gradient-accent': 'linear-gradient(135deg, #f59e0b, #f97316)',
      },
    },
  },
  plugins: [],
} satisfies Config
