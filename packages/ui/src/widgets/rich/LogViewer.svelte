<script lang="ts">
  export interface LogEntry { timestamp?: string; level?: 'debug'|'info'|'warn'|'error'; message: string; source?: string; }
  export interface LogViewerSpec { title?: string; entries?: LogEntry[]; maxHeight?: string; }
  interface Props { spec: Partial<LogViewerSpec>; data?: unknown; }
  let { spec, data }: Props = $props();
  const LEVEL: Record<string,string> = { debug:'text-zinc-600', info:'text-[#3ecfb2]', warn:'text-[#f0a050]', error:'text-[#fa6d7c]' };
  const entries=$derived<LogEntry[]>(Array.isArray(spec.entries)&&spec.entries.length?spec.entries:Array.isArray(data)?data as LogEntry[]:[]);
</script>
<div class="bg-[#0a0a0f] border border-white/[0.07] rounded-lg font-mono">
  {#if spec.title}<div class="px-4 py-2 border-b border-white/[0.07] text-xs text-zinc-500">{spec.title}</div>{/if}
  <div class="overflow-y-auto text-xs leading-5 p-3 flex flex-col gap-0.5" style="max-height:{spec.maxHeight??'320px'};">
    {#if !entries.length}<span class="text-zinc-700">Aucune entrée de log</span>
    {:else}
      {#each entries as e}
        <div class="flex gap-2 items-start hover:bg-white/[0.02] px-1 rounded">
          {#if e.timestamp}<span class="text-zinc-700 flex-shrink-0">{e.timestamp}</span>{/if}
          <span class="flex-shrink-0 uppercase text-[10px] font-semibold w-10 {LEVEL[e.level??'info']??LEVEL.info}">{e.level??'info'}</span>
          {#if e.source}<span class="text-zinc-600 flex-shrink-0">[{e.source}]</span>{/if}
          <span class="text-zinc-300 break-all">{e.message}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>
