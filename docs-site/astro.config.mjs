import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://jeanbaptiste.github.io',
  base: '/webmcp-auto-ui',
  integrations: [
    starlight({
      title: 'WebMCP Auto-UI',
      defaultLocale: 'fr',
      locales: {
        fr: { label: 'Français', lang: 'fr' },
        en: { label: 'English', lang: 'en' },
      },
      social: {
        github: 'https://github.com/jeanbaptiste/webmcp-auto-ui',
      },
      sidebar: [
        { label: 'Accueil', slug: 'fr' },
        {
          label: 'Guide',
          items: [
            { label: 'Installation', slug: 'fr/guide/installation' },
            { label: 'Architecture', slug: 'fr/guide/architecture' },
            { label: 'Workflow', slug: 'fr/guide/workflow' },
            { label: 'Déploiement', slug: 'fr/guide/deploy' },
            { label: 'Composants custom', slug: 'fr/guide/custom-components' },
          ],
        },
        {
          label: 'Packages',
          items: [
            { label: 'agent', slug: 'fr/packages/agent' },
            { label: 'core', slug: 'fr/packages/core' },
            { label: 'sdk', slug: 'fr/packages/sdk' },
            { label: 'ui', slug: 'fr/packages/ui' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'ToolLayers', slug: 'fr/concepts/tool-layers' },
            { label: 'component()', slug: 'fr/concepts/component-tool' },
            { label: 'Recettes', slug: 'fr/concepts/recipes' },
            { label: 'Widgets UI', slug: 'fr/concepts/ui-widgets' },
            { label: 'MCP', slug: 'fr/concepts/mcp' },
          ],
        },
        {
          label: 'Apps',
          items: [
            { label: 'flex2', slug: 'fr/apps/flex2' },
            { label: 'viewer2', slug: 'fr/apps/viewer2' },
            { label: 'showcase2', slug: 'fr/apps/showcase2' },
            { label: 'recipes', slug: 'fr/apps/recipes' },
            { label: 'todo2', slug: 'fr/apps/todo2' },
          ],
        },
      ],
    }),
  ],
});
