<script lang="ts">
  import '../app.css';
  import { ThemeProvider } from '@webmcp-auto-ui/ui';
  let { children } = $props();
</script>
<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
</svelte:head>
<ThemeProvider defaultMode="dark">
  {@render children()}
</ThemeProvider>
