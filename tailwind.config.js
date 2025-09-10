/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens - Dark theme
        background: '#292c2f',
        surface: '#363a3d',
        border: '#4a4f52',
        text: '#ececec',
        'text-secondary': '#b8bcc0',
        primary: '#FFDF00',
        'primary-hover': '#e6c700',
        secondary: '#32174d',
        accent: '#FFDF00',
        success: '#4ade80',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        icon: '#32174d',
    golden: '#FFDF00', // Existing color
    inkdark: '#292C2F', // New color
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'soft': '0 4px 20px 0 rgba(0, 0, 0, 0.1)',
        'soft-lg': '0 8px 30px 0 rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
}
