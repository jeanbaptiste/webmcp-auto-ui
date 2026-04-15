<script lang="ts">
  interface Props {
    serverName?: string;
    componentName?: string;
  }
  let { serverName = '', componentName = '' }: Props = $props();
</script>

{#if serverName || componentName}
  <div class="provenance-badge">
    <span class="icon">⚡</span>
    {#if serverName}
      <span class="server">{serverName}</span>
    {/if}
    {#if serverName && componentName && componentName !== serverName}
      <span class="sep">/</span>
      <span class="component">{componentName}</span>
    {:else if !serverName && componentName}
      <span class="component">{componentName}</span>
    {/if}
  </div>
{/if}

<style>
  .provenance-badge {
    position: absolute;
    bottom: 3px;
    right: 6px;
    display: flex;
    align-items: center;
    gap: 2px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px;
    line-height: 1;
    color: var(--color-text2, #888);
    opacity: 0.55;
    pointer-events: none;
    z-index: 5;
    max-width: 88%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: var(--color-surface2, rgba(0,0,0,0.04));
    padding: 1px 4px;
    border-radius: 3px;
  }
  .provenance-badge:hover {
    opacity: 0.85;
  }
  .icon {
    font-size: 8px;
    flex-shrink: 0;
  }
  .server {
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  .sep {
    opacity: 0.5;
    margin: 0 1px;
  }
  .component {
    opacity: 0.8;
  }
</style>
