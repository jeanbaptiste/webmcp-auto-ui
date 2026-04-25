<script lang="ts">
  import { X } from 'lucide-svelte';
  import { WebMCPserversList } from '@webmcp-auto-ui/ui';
  import { SERVER_REGISTRY } from './server-registry.js';

  interface Props {
    open: boolean;
    enabledServers: Set<string>;
    onclose: () => void;
    onToggle: (id: string) => void;
  }
  let { open, enabledServers, onclose, onToggle }: Props = $props();

  const servers = SERVER_REGISTRY.map(({ id, server }) => ({
    id,
    label: server.name,
    description: server.description,
    widgetCount: server.listWidgets().length,
  }));
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="WebMCP servers">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="absolute inset-0 bg-black/40" onclick={onclose} role="presentation"></div>
    <div class="relative w-96 max-w-full h-full bg-surface border-l border-border overflow-y-auto p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div class="flex flex-col">
          <span class="text-xs font-mono font-semibold text-text1">WebMCP servers</span>
          <span class="text-[10px] font-mono text-text2">
            {enabledServers.size}/{servers.length} active — toggle to swap renderers
          </span>
        </div>
        <button onclick={onclose}
                class="p-1 rounded hover:bg-surface2 text-text2 hover:text-text1 transition-colors"
                aria-label="Close drawer">
          <X size={14} />
        </button>
      </div>
      <WebMCPserversList {servers} {enabledServers} {onToggle} />
    </div>
  </div>
{/if}
