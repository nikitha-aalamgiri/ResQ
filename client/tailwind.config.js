/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy-ink': '#0F2A3D',
        'teal-deep': '#1F6F78',
        'teal-light': '#E6F1F2',
        'app-bg': '#F7F5F1',
        'surface': '#FFFFFF',
        'app-border': '#E2DED6',
        'muted-text': '#5B6770',
        severity: {
          critical: '#B42318',
          high: '#B54708',
          medium: '#A16207',
          low: '#3B7A57',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'DEFAULT': '6px',
        'md': '6px',
        'lg': '8px',
      },
      backgroundImage: {
        'app-header-gradient': 'linear-gradient(135deg, #0F2A3D 0%, #1F6F78 100%)',
      }
    },
  },
  plugins: [],
}
