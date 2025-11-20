import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // LawScanner Color Palette
        'floral-white': '#fffcf2',
        'silver': '#ccc5b9',
        'charcoal-brown': '#403d39',
        'carbon-black': '#252422',
        'spicy-paprika': '#eb5e28',

        // Semantic aliases
        'primary': '#eb5e28',
        'primary-hover': '#d54d1a',
        'background': '#fffcf2',
        'surface': '#ccc5b9',
        'text-primary': '#252422',
        'text-secondary': '#403d39',
        'border': '#ccc5b9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(37, 36, 34, 0.1), 0 2px 4px -1px rgba(37, 36, 34, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(37, 36, 34, 0.1), 0 4px 6px -2px rgba(37, 36, 34, 0.05)',
      },
    },
  },
  plugins: [],
}
export default config
