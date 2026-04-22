<script lang="ts">
  // Scaffold — Agent E will replace this with the real viewer.
  // Reads ?hs=<full> or ?n=<short> from URL, decodes via SDK,
  // mounts the appropriate notebook-* widget in mode:'view'.
  import { onMount } from 'svelte';
  let status = $state('scaffold');

  onMount(() => {
    status = 'Agent E: wire decode + mountWidget here';
  });
</script>

<main>
  <h1>Notebook viewer</h1>
  <p>{status}</p>
</main>
