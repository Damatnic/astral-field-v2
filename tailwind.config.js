
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // 🎨 Enhanced Astral Color System
      colors: {
        // Core System Colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        
        // Astral Quantum Blue - Primary System
        quantum: {
          50: '#e6f3ff',
          100: '#b3daff',
          200: '#80c2ff',
          300: '#4da9ff',
          400: '#1a91ff',
          500: '#0066cc',
          600: '#0052a3',
          700: '#003d7a',
          800: '#002952',
          900: '#001429',
          950: '#000a14',
          DEFAULT: '#0066cc',
        },
        
        // Astral Cosmic Purple - Secondary
        cosmic: {
          50: '#f3e6ff',
          100: '#dab3ff',
          200: '#c280ff',
          300: '#a94dff',
          400: '#911aff',
          500: '#6600cc',
          600: '#5200a3',
          700: '#3d007a',
          800: '#290052',
          900: '#140029',
          950: '#0a0014',
          DEFAULT: '#6600cc',
        },
        
        // Astral Nebula Pink - Accent
        nebula: {
          50: '#ffe6f7',
          100: '#ffb3e6',
          200: '#ff80d5',
          300: '#ff4dc4',
          400: '#ff1ab3',
          500: '#cc0088',
          600: '#a3006b',
          700: '#7a004e',
          800: '#520031',
          900: '#290014',
          950: '#14000a',
          DEFAULT: '#cc0088',
        },
        
        // Astral Galaxy Gold - Success/Highlight
        gold: {
          50: '#fff9e6',
          100: '#ffecb3',
          200: '#ffdf80',
          300: '#ffd24d',
          400: '#ffc51a',
          500: '#cc9900',
          600: '#a37a00',
          700: '#7a5c00',
          800: '#523d00',
          900: '#291f00',
          950: '#140f00',
          DEFAULT: '#cc9900',
        },
        
        // Astral Solar Orange - Warning
        solar: {
          50: '#fff2e6',
          100: '#ffd9b3',
          200: '#ffc080',
          300: '#ffa74d',
          400: '#ff8e1a',
          500: '#cc5500',
          600: '#a34400',
          700: '#7a3300',
          800: '#522200',
          900: '#291100',
          950: '#140800',
          DEFAULT: '#cc5500',
        },
        
        // Astral Supernova Red - Danger
        supernova: {
          50: '#ffe6e6',
          100: '#ffb3b3',
          200: '#ff8080',
          300: '#ff4d4d',
          400: '#ff1a1a',
          500: '#cc0000',
          600: '#a30000',
          700: '#7a0000',
          800: '#520000',
          900: '#290000',
          950: '#140000',
          DEFAULT: '#cc0000',
        },
        
        // Dark Matter Spectrum
        void: {
          50: '#1a1a1a',
          100: '#0f0f0f',
          200: '#0a0a0a',
          300: '#050505',
          400: '#030303',
          500: '#000000',
          DEFAULT: '#000000',
        },
        
        // Light Cosmos Spectrum
        starlight: {
          50: '#ffffff',
          100: '#f8fafc',
          200: '#f1f5f9',
          300: '#e2e8f0',
          400: '#cbd5e1',
          500: '#94a3b8',
          600: '#64748b',
          700: '#475569',
          800: '#334155',
          900: '#1e293b',
          DEFAULT: '#ffffff',
        },
        
        // Legacy Compatibility
        primary: {
          50: '#e6f3ff',
          100: '#b3daff',
          200: '#80c2ff',
          300: '#4da9ff',
          400: '#1a91ff',
          500: '#0066cc',
          600: '#0052a3',
          700: '#003d7a',
          800: '#002952',
          900: '#001429',
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      
      // 🎭 Enhanced Typography Scale
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Consolas', 'monospace'],
        display: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        '2xs': '0.625rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        '7xl': '4.5rem',
        '8xl': '6rem',
        '9xl': '8rem',
      },
      
      // 🌌 Enhanced Spacing System
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
      },
      
      // 🎯 Enhanced Border Radius
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      
      // ✨ Advanced Animations & Keyframes
      keyframes: {
        // Legacy
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        
        // Astral Animations
        'cosmic-glow': {
          '0%, 100%': { 
            'box-shadow': '0 0 20px rgba(26, 145, 255, 0.5), 0 0 40px rgba(102, 0, 204, 0.3), 0 0 60px rgba(204, 0, 136, 0.2)',
          },
          '50%': { 
            'box-shadow': '0 0 30px rgba(102, 0, 204, 0.6), 0 0 60px rgba(204, 0, 136, 0.4), 0 0 90px rgba(26, 145, 255, 0.3)',
          },
        },
        
        'nebula-pulse': {
          '0%, 100%': { 
            'background-size': '100% 100%', 
            opacity: '0.8',
          },
          '50%': { 
            'background-size': '120% 120%', 
            opacity: '1',
          },
        },
        
        'quantum-shimmer': {
          '0%': { 'background-position': '-200% 0' },
          '100%': { 'background-position': '200% 0' },
        },
        
        'starfield-drift': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '100%': { transform: 'rotate(360deg) scale(1.05)' },
        },
        
        'particle-float': {
          '0%, 100%': { 
            transform: 'translateY(0px) rotate(0deg)', 
            opacity: '0.7',
          },
          '25%': { 
            transform: 'translateY(-20px) rotate(90deg)', 
            opacity: '1',
          },
          '50%': { 
            transform: 'translateY(-40px) rotate(180deg)', 
            opacity: '0.8',
          },
          '75%': { 
            transform: 'translateY(-20px) rotate(270deg)', 
            opacity: '1',
          },
        },
        
        'hologram-flicker': {
          '0%, 100%': { 
            opacity: '1', 
            filter: 'hue-rotate(0deg)',
          },
          '50%': { 
            opacity: '0.85', 
            filter: 'hue-rotate(90deg)',
          },
        },
        
        'energy-surge': {
          '0%': { 
            transform: 'scale(1) rotate(0deg)',
            filter: 'brightness(1) saturate(1)',
          },
          '50%': { 
            transform: 'scale(1.05) rotate(180deg)',
            filter: 'brightness(1.2) saturate(1.3)',
          },
          '100%': { 
            transform: 'scale(1) rotate(360deg)',
            filter: 'brightness(1) saturate(1)',
          },
        },
        
        'fade-slide-up': {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(30px)',
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0)',
          },
        },
        
        'fade-slide-in': {
          '0%': { 
            opacity: '0', 
            transform: 'translateX(-30px)',
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateX(0)',
          },
        },
        
        'scale-fade-in': {
          '0%': { 
            opacity: '0', 
            transform: 'scale(0.8)',
          },
          '100%': { 
            opacity: '1', 
            transform: 'scale(1)',
          },
        },
      },
      
      animation: {
        // Legacy
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        
        // Astral Animations
        'cosmic-glow': 'cosmic-glow 4s ease-in-out infinite',
        'nebula-pulse': 'nebula-pulse 3s ease-in-out infinite',
        'quantum-shimmer': 'quantum-shimmer 2s linear infinite',
        'starfield-drift': 'starfield-drift 30s linear infinite',
        'particle-float': 'particle-float 8s ease-in-out infinite',
        'hologram-flicker': 'hologram-flicker 4s ease-in-out infinite',
        'energy-surge': 'energy-surge 6s ease-in-out infinite',
        'fade-slide-up': 'fade-slide-up 0.6s ease-out forwards',
        'fade-slide-in': 'fade-slide-in 0.6s ease-out forwards',
        'scale-fade-in': 'scale-fade-in 0.5s ease-out forwards',
      },
      
      // 🎪 Advanced Box Shadows
      boxShadow: {
        'quantum': '0 25px 50px -12px rgba(26, 145, 255, 0.25)',
        'cosmic': '0 25px 50px -12px rgba(102, 0, 204, 0.25)',
        'nebula': '0 25px 50px -12px rgba(204, 0, 136, 0.25)',
        'gold': '0 25px 50px -12px rgba(204, 153, 0, 0.25)',
        'void': '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        'glow-quantum': '0 0 30px rgba(26, 145, 255, 0.5)',
        'glow-cosmic': '0 0 30px rgba(102, 0, 204, 0.5)',
        'glow-nebula': '0 0 30px rgba(204, 0, 136, 0.5)',
        'glass': '0 8px 32px rgba(255, 255, 255, 0.1)',
        'inner-glow': 'inset 0 0 20px rgba(26, 145, 255, 0.2)',
      },
      
      // 🌈 Advanced Gradients
      backgroundImage: {
        'gradient-cosmic': 'linear-gradient(135deg, #1a91ff 0%, #6600cc 50%, #cc0088 100%)',
        'gradient-nebula': 'linear-gradient(135deg, #0066cc 0%, #1a91ff 25%, #6600cc 50%, #cc0088 75%, #ff1ab3 100%)',
        'gradient-aurora': 'linear-gradient(45deg, #0066cc 0%, #1a91ff 25%, #6600cc 50%, #cc0088 75%, #ff1ab3 100%)',
        'gradient-quantum': 'radial-gradient(circle at 30% 70%, #0066cc 0%, #1a91ff 40%, #6600cc 70%, #cc0088 100%)',
        'gradient-starfield': 'conic-gradient(from 0deg, #000000, #0066cc, #6600cc, #cc0088, #000000)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
      },
      
      // 🎨 Enhanced Backdrop Filters
      backdropBlur: {
        'xs': '2px',
        '4xl': '72px',
        '5xl': '96px',
      },
      
      // 🎯 Enhanced Z-Index Scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Custom plugin for advanced utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        '.text-glow': {
          'text-shadow': '0 0 10px currentColor',
        },
        '.text-glow-strong': {
          'text-shadow': '0 0 20px currentColor, 0 0 40px currentColor',
        },
        '.glass-morphism': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.glass-dark': {
          'background': 'rgba(0, 0, 0, 0.1)',
          'backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.perspective-1000': {
          'perspective': '1000px',
        },
        '.transform-gpu': {
          'transform': 'translate3d(0, 0, 0)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}
