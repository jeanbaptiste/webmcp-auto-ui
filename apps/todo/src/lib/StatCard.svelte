<script lang="ts">
  import '@webmcp-auto-ui/ui/widgets/rich/stat-card.svelte';

  let { spec }: { spec: Record<string, unknown> } = $props();
</script>

<auto-stat-card data={spec}></auto-stat-card>
