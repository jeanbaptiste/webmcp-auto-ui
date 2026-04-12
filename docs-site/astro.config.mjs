import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://jeanbaptiste.github.io',
  base: '/webmcp-auto-ui',
  integrations: [
    starlight({
      title: 'WebMCP Auto-UI',
      head: [
        {
          tag: 'script',
          attrs: { type: 'module' },
          content: `
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: false, theme: 'default' });
document.addEventListener('DOMContentLoaded', async () => {
  const blocks = document.querySelectorAll('pre > code.language-mermaid');
  for (const code of blocks) {
    const pre = code.parentElement;
    const text = code.textContent;
    const id = 'mermaid-' + Math.random().toString(36).slice(2, 9);
    const { svg } = await mermaid.render(id, text);
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.innerHTML = svg;
    pre.replaceWith(div);
  }
});
`,
        },
      ],
      defaultLocale: 'root',
      locales: {
        root: { label: 'Français', lang: 'fr' },
        en: { label: 'English', lang: 'en' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/jeanbaptiste/webmcp-auto-ui' },
      ],
      sidebar: [
        {
          label: 'Guide',
          autogenerate: { directory: 'guide' },
        },
        {
          label: 'Packages',
          autogenerate: { directory: 'packages' },
        },
        {
          label: 'Concepts',
          autogenerate: { directory: 'concepts' },
        },
        {
          label: 'Tutorials',
          autogenerate: { directory: 'tutorials' },
        },
        {
          label: 'Apps',
          autogenerate: { directory: 'apps' },
        },
      ],
    }),
  ],
});
