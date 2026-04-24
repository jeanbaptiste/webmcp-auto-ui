<script lang="ts">
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@webmcp-auto-ui/ui';

  interface HistoryEntry { id: string; role: string; content: string; ts: Date; }
  interface Props {
    open: boolean;
    messages: HistoryEntry[];
  }
  let { open = $bindable(false), messages }: Props = $props();
  let selected = $state<HistoryEntry | null>(null);

  const ROW_BG: Record<string, string> = {
    user:      'bg-accent/10',
    assistant: 'bg-teal/10',
    system:    'bg-amber/10',
  };
  const BADGE_COLOR: Record<string, string> = {
    user:      'text-accent border-accent/40',
    assistant: 'text-teal border-teal/40',
    system:    'text-amber border-amber/40',
  };

  function fmt(d: Date) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
</script>

<Dialog bind:open>
  <DialogContent class="!left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !max-w-none !w-[calc(100vw-5rem)] !h-[calc(100vh-5rem)] !p-0 !rounded-2xl flex flex-col overflow-hidden">
    <DialogHeader class="flex-row items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0 !mb-0 !gap-0">
      <DialogTitle class="!text-sm !font-bold">History</DialogTitle>
      <span class="font-mono text-xs text-text2 ml-3">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
    </DialogHeader>

    <div class="flex-1 overflow-auto">
      {#if messages.length === 0}
        <div class="flex items-center justify-center h-full text-text2 font-mono text-sm">
          No messages yet
        </div>
      {:else}
        <table class="w-full text-xs font-mono border-collapse">
          <thead class="sticky top-0 bg-surface border-b border-border z-10">
            <tr>
              <th class="text-left px-5 py-2.5 text-text2 font-medium w-[12%]">Time</th>
              <th class="text-left px-5 py-2.5 text-text2 font-medium w-[10%]">Role</th>
              <th class="text-left px-5 py-2.5 text-text2 font-medium">Content</th>
            </tr>
          </thead>
          <tbody>
            {#each messages as msg (msg.id)}
              <tr class="{ROW_BG[msg.role] ?? ''} border-b border-border/40 hover:brightness-[0.97] transition-all cursor-pointer"
                  onclick={() => selected = msg}>
                <td class="px-5 py-3 text-text2 whitespace-nowrap">{fmt(msg.ts)}</td>
                <td class="px-5 py-3">
                  <span class="inline-block px-2 py-0.5 rounded-full text-[10px] border {BADGE_COLOR[msg.role] ?? 'text-text2 border-border2'}">
                    {msg.role}
                  </span>
                </td>
                <td class="px-5 py-3 text-text1 max-w-0">
                  <div class="truncate">{msg.content}</div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </DialogContent>
</Dialog>

<!-- Detail dialog for a selected message -->
<Dialog open={!!selected} onOpenChange={(v) => { if (!v) selected = null; }}>
  <DialogContent class="!max-w-3xl !max-h-[80vh] !p-0 !rounded-xl flex flex-col overflow-hidden">
    <DialogHeader class="flex-row items-center gap-3 px-5 py-3 border-b border-border flex-shrink-0 !mb-0">
      {#if selected}
        <span class="inline-block px-2 py-0.5 rounded-full text-[10px] border {BADGE_COLOR[selected.role] ?? 'text-text2 border-border2'}">
          {selected.role}
        </span>
        <span class="font-mono text-xs text-text2">{fmt(selected.ts)}</span>
      {/if}
    </DialogHeader>
    {#if selected}
      <div class="flex-1 overflow-auto p-5">
        <pre class="font-mono text-xs text-text1 whitespace-pre-wrap break-words">{selected.content}</pre>
      </div>
    {/if}
  </DialogContent>
</Dialog>
