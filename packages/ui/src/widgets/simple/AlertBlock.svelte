<script lang="ts">
  export interface AlertBlockData { title?: string; message?: string; level?: 'info' | 'warn' | 'error'; }
  interface Props { data: Partial<AlertBlockData>; }
  let { data }: Props = $props();
  const borderColor = $derived(data.level === 'error' ? 'border-accent2' : data.level === 'info' ? 'border-blue-500' : 'border-amber');
  const titleColor = $derived(data.level === 'error' ? 'text-accent2' : data.level === 'info' ? 'text-blue-400' : 'text-amber');
</script>
<div class="p-3 md:p-4 border-l-4 {borderColor}">
  {#if data.title}<div class="font-semibold text-sm mb-1 {titleColor}">{data.title}</div>{/if}
  {#if data.message}<div class="text-xs font-mono text-text2">{data.message}</div>{/if}
</div>
