import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://jeanbaptiste.github.io',
  base: '/webmcp-auto-ui',
  integrations: [
    starlight({
      title: 'WebMCP Auto-UI',
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
