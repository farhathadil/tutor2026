import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // All colors are CSS variables so dark mode swaps them automatically.
        // The <alpha-value> token lets Tailwind generate opacity variants (bg-gold/20, etc.).
        surface:        'rgb(var(--surface)        / <alpha-value>)',
        ink:            'rgb(var(--ink)            / <alpha-value>)',
        'ink-2':        'rgb(var(--ink-2)          / <alpha-value>)',
        'ink-3':        'rgb(var(--ink-3)          / <alpha-value>)',
        'ink-4':        'rgb(var(--ink-4)          / <alpha-value>)',
        paper:          'rgb(var(--paper)          / <alpha-value>)',
        'paper-2':      'rgb(var(--paper-2)        / <alpha-value>)',
        'paper-3':      'rgb(var(--paper-3)        / <alpha-value>)',
        gold:           'rgb(var(--gold)           / <alpha-value>)',
        'gold-light':   'rgb(var(--gold-light)     / <alpha-value>)',
        teal:           'rgb(var(--teal)           / <alpha-value>)',
        'teal-light':   'rgb(var(--teal-light)     / <alpha-value>)',
        crimson:        'rgb(var(--crimson)        / <alpha-value>)',
        'crimson-light':'rgb(var(--crimson-light)  / <alpha-value>)',
        cobalt:         'rgb(var(--cobalt)         / <alpha-value>)',
        'cobalt-light': 'rgb(var(--cobalt-light)   / <alpha-value>)',
        sage:           'rgb(var(--sage)           / <alpha-value>)',
        'sage-light':   'rgb(var(--sage-light)     / <alpha-value>)',
        rule:           'rgb(var(--rule)           / <alpha-value>)',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
