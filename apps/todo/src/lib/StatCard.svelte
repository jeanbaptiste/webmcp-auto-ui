<script lang="ts">
  import { renderStatCard } from '@webmcp-auto-ui/ui';

  let { spec }: { spec: Record<string, unknown> } = $props();
  let host: HTMLDivElement;

  $effect(() => {
    if (!host) return;
    return renderStatCard(host, spec);
  });
</script>

<div bind:this={host}></div>
