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
const pres = document.querySelectorAll('pre[data-language="mermaid"]');
for (const pre of pres) {
  try {
    const text = pre.textContent;
    const id = 'mermaid-' + Math.random().toString(36).slice(2, 9);
    const { svg } = await mermaid.render(id, text);
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.innerHTML = svg;
    const wrapper = pre.closest('.expressive-code') || pre.parentElement;
    wrapper.replaceWith(div);
  } catch (e) { console.warn('Mermaid render error:', e); }
}
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
