<script lang="ts">
  interface Props {
    serverName?: string;
    componentName?: string;
  }
  let { serverName = '', componentName = '' }: Props = $props();
</script>

{#if serverName || componentName}
  <div class="provenance-badge">
    {#if serverName}
      <span class="font-bold">{serverName}</span>
    {/if}
    {#if serverName && componentName}
      <span class="opacity-50"> / </span>
    {/if}
    {#if componentName}
      <span>{componentName}</span>
    {/if}
  </div>
{/if}

<style>
  .provenance-badge {
    position: absolute;
    bottom: 4px;
    right: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 8px;
    line-height: 1;
    color: var(--color-text2);
    opacity: 0.6;
    pointer-events: none;
    z-index: 5;
    max-width: 90%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
