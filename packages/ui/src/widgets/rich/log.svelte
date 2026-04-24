<svelte:options customElement={{ tag: 'auto-log', shadow: 'none' }} />

<script lang="ts">
  export interface LogEntry {
    timestamp?: string;
    level?: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    source?: string;
  }

  export interface LogData {
    title?: string;
    entries?: LogEntry[];
    maxHeight?: string;
  }

  interface Props { data?: LogData | null; }
  let { data = {} }: Props = $props();

  const LEVEL: Record<string, string> = {
    debug: 'text-text2',
    info: 'text-teal',
    warn: 'text-amber',
    error: 'text-accent2',
  };

  const entries = $derived<LogEntry[]>(
    Array.isArray(data?.entries) && data!.entries!.length ? data!.entries! : []
  );
</script>

<div class="bg-bg border border-border rounded-lg font-mono">
  {#if data?.title}
    <div class="px-4 py-2 border-b border-border text-xs text-text2">{data.title}</div>
  {/if}
  <div
    class="overflow-y-auto text-xs leading-5 p-3 flex flex-col gap-0.5"
    style="max-height:{data?.maxHeight ?? '320px'};"
    role="log"
    aria-live="polite"
    aria-label={data?.title ?? 'Journal'}
  >
    {#if !entries.length}
      <span class="text-text2">No log entries</span>
    {:else}
      {#each entries as e}
        <div class="flex gap-2 items-start hover:bg-surface2 px-1 rounded">
          {#if e.timestamp}
            <span class="text-text2 flex-shrink-0">{e.timestamp}</span>
          {/if}
          <span class="flex-shrink-0 uppercase text-[10px] font-semibold w-10 {LEVEL[e.level ?? 'info'] ?? LEVEL.info}">
            {e.level ?? 'info'}
          </span>
          {#if e.source}
            <span class="text-text2 flex-shrink-0">[{e.source}]</span>
          {/if}
          <span class="text-text1 break-all">{e.message}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>
