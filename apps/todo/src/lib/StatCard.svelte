<script lang="ts">
  import { onMount } from 'svelte';
  import { renderStatCard } from '@webmcp-auto-ui/ui';

  let { spec }: { spec: Record<string, unknown> } = $props();
  let host: HTMLDivElement;

  onMount(() => renderStatCard(host, { spec }));
</script>

<div bind:this={host}></div>
