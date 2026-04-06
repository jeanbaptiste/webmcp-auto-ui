export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        bg: '#0e0e11',
        surface: '#16161a',
        surface2: '#1e1e24',
        border: 'rgba(255,255,255,0.07)',
        border2: 'rgba(255,255,255,0.14)',
        accent: '#7c6dfa',
        accent2: '#fa6d7c',
        amber: '#f0a050',
        teal: '#3ecfb2',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['Syne', 'system-ui', 'sans-serif'],
      }
    }
  }
};
