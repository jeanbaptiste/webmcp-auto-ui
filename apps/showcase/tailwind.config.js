import uiPreset from '@webmcp-auto-ui/ui/tailwind.preset';

export default {
  presets: [uiPreset],
  content: [
    './src/**/*.{html,js,svelte,ts}',
    '../../packages/ui/src/**/*.{svelte,ts}',
  ],
};
