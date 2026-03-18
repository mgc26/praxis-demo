import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        praxis: {
          teal: '#00B9CE',
          'teal-light': '#25C8D9',
          'teal-dark': '#009AAD',
          secondary: '#485D61',
          accent: '#DE7D00',
          gold: '#EFBC66',
          coral: '#FF7D78',
          blue: '#2C59AB',
        },
        vi: {
          navy: '#485D61',
          teal: '#00B9CE',
          'teal-light': '#E0F7FA',
        },
        clinical: {
          green: '#34A853',
          'green-light': '#E8F5E9',
        },
        priority: {
          high: '#FF7D78',
          medium: '#DE7D00',
          low: '#34A853',
        },
        surface: {
          cream: '#F5F5F5',
          light: '#E2E7EA',
          white: '#FFFFFF',
          border: '#E2E7EA',
        },
        text: {
          primary: '#000000',
          secondary: '#485D61',
          muted: '#ACB0B3',
          dark: '#000000',
        },
        btn: {
          dark: '#485D61',
          'dark-hover': '#333F42',
        },
        brand: {
          DEFAULT: 'rgb(var(--brand-primary) / <alpha-value>)',
          dark: 'rgb(var(--brand-primary-dark) / <alpha-value>)',
          light: 'rgb(var(--brand-primary-light) / <alpha-value>)',
          secondary: 'rgb(var(--brand-secondary) / <alpha-value>)',
          accent: 'rgb(var(--brand-accent) / <alpha-value>)',
          accent2: 'rgb(var(--brand-accent2) / <alpha-value>)',
          accent3: 'rgb(var(--brand-accent3) / <alpha-value>)',
          info: 'rgb(var(--brand-info) / <alpha-value>)',
          surface: 'rgb(var(--brand-surface) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'Fira Code', 'monospace'],
        'brand-heading': ['var(--brand-heading-font)'],
        'brand-body': ['var(--brand-body-font)'],
      },
      borderRadius: {
        none: '0px',
      },
    },
  },
  plugins: [],
};

export default config;
