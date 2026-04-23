<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Error — nb.hyperskills.net</title>
</svelte:head>

<main class="nb-page nb-error">
  <h1>{$page.status} — {$page.error?.message || 'Something went wrong'}</h1>
  <p>This URL could not be resolved.</p>
  <p><a href="/">← Back to index</a></p>
</main>
