import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ─── BookedUp brand ─────────────────────────────
        ink: {
          950: '#050608',     // deep OLED black
          900: '#0a0b10',
          800: '#0f1118',
          700: '#161824',
          600: '#1f2230',
          500: '#2a2e3f',
        },
        electric: {
          DEFAULT: '#3b82ff',
          50:  '#eaf1ff',
          100: '#d4e3ff',
          200: '#a8c7ff',
          300: '#7dabff',
          400: '#5294ff',
          500: '#3b82ff',
          600: '#1f63e6',
          700: '#1450bf',
          800: '#0d3d99',
          900: '#082a6b',
        },
        // Booking-conversion warm accent (used sparingly for "Réserver maintenant")
        spark: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Functional
        success: '#22c55e',
        warning: '#f59e0b',
        danger:  '#ef4444',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Fluid display sizes (clamp)
        'display-xl': ['clamp(2.75rem, 6vw, 5.5rem)', { lineHeight: '1.02', letterSpacing: '-0.035em', fontWeight: '700' }],
        'display-lg': ['clamp(2.25rem, 4vw, 3.75rem)', { lineHeight: '1.04', letterSpacing: '-0.03em',  fontWeight: '700' }],
        'display-md': ['clamp(1.75rem, 3vw, 2.5rem)',  { lineHeight: '1.1',  letterSpacing: '-0.02em',  fontWeight: '600' }],
      },
      borderRadius: {
        'xl':  '14px',
        '2xl': '20px',
        '3xl': '28px',
        'bento': '24px',
      },
      backgroundImage: {
        'grid-faint': 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
        'glow-blue':  'radial-gradient(60% 60% at 50% 0%, rgba(59,130,255,0.28) 0%, transparent 70%)',
        'glow-spark': 'radial-gradient(60% 60% at 50% 100%, rgba(245,158,11,0.18) 0%, transparent 70%)',
        'shimmer':    'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)',
      },
      boxShadow: {
        'glow':       '0 0 0 1px rgba(59,130,255,0.4), 0 8px 32px -8px rgba(59,130,255,0.5)',
        'glow-spark': '0 0 0 1px rgba(245,158,11,0.4), 0 8px 32px -8px rgba(245,158,11,0.5)',
        'bento':      '0 1px 2px rgba(0,0,0,0.4), 0 4px 16px -4px rgba(0,0,0,0.6)',
        'card-hover': '0 12px 32px -8px rgba(59,130,255,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%':      { opacity: '1' },
        },
      },
      animation: {
        'fade-up':    'fade-up .5s ease-out both',
        'shimmer':    'shimmer 2.4s linear infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
      },
      transitionDuration: {
        '50':  '50ms',
        '80':  '80ms',
        '120': '120ms',
      },
    },
  },
  plugins: [],
};

export default config;
