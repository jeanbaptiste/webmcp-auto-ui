<script lang="ts">
  interface ServerOption {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
  }

  interface Props {
    servers: ServerOption[];
    onchange: (id: string, enabled: boolean) => void;
  }
  let { servers, onchange }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  <span class="text-[10px] uppercase tracking-wider text-text2 mb-1">Serveurs WebMCP</span>
  {#each servers as server (server.id)}
    <label class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface2/50 cursor-pointer transition-colors group">
      <input
        type="checkbox"
        checked={server.enabled}
        onchange={() => onchange(server.id, !server.enabled)}
        class="w-3.5 h-3.5 rounded border-border2 accent-accent cursor-pointer"
      />
      <div class="flex flex-col min-w-0">
        <span class="text-xs font-mono text-text1 group-hover:text-accent transition-colors truncate">{server.label}</span>
        <span class="text-[10px] text-text2 truncate">{server.description}</span>
      </div>
    </label>
  {/each}
</div>
