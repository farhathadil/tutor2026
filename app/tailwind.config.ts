import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1814',
        'ink-2': '#3d3830',
        'ink-3': '#6b6459',
        'ink-4': '#9c9488',
        paper: '#faf8f4',
        'paper-2': '#f2ede4',
        'paper-3': '#e8e0d3',
        gold: '#c8922a',
        'gold-light': '#f0d080',
        teal: '#1a7a6e',
        'teal-light': '#e0f2ef',
        crimson: '#8b2635',
        'crimson-light': '#f5e8ea',
        cobalt: '#1a3d7a',
        'cobalt-light': '#e8edf8',
        sage: '#3d6b45',
        'sage-light': '#e6f0e8',
        rule: '#d4cdc2',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
