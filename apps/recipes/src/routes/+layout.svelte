<script lang="ts">
  import '../app.css';
  import { ThemeProvider } from '@webmcp-auto-ui/ui';

  let { children } = $props();
</script>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<ThemeProvider defaultMode="light">
  {@render children()}
</ThemeProvider>
