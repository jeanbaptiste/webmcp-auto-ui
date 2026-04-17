<script lang="ts">
  import { fade, fly } from 'svelte/transition';

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

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-10"
    transition:fade={{ duration: 180 }}
    onclick={(e) => { if (e.target === e.currentTarget) open = false; }}
  >
    <div
      class="w-full h-full bg-surface border border-border2 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
      transition:fly={{ y: 24, duration: 240 }}
    >
      <div class="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0">
        <span class="font-mono text-sm font-bold text-text1">Historique</span>
        <span class="font-mono text-xs text-text2">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
        <div class="flex-1"></div>
        <button class="text-text2 hover:text-text1 font-mono text-base leading-none transition-colors"
                onclick={() => open = false}>x</button>
      </div>

      <div class="flex-1 overflow-auto">
        {#if messages.length === 0}
          <div class="flex items-center justify-center h-full text-text2 font-mono text-sm">
            Aucun message pour l'instant
          </div>
        {:else}
          <table class="w-full text-xs font-mono border-collapse">
            <thead class="sticky top-0 bg-surface border-b border-border z-10">
              <tr>
                <th class="text-left px-5 py-2.5 text-text2 font-medium w-[12%]">Heure</th>
                <th class="text-left px-5 py-2.5 text-text2 font-medium w-[10%]">Role</th>
                <th class="text-left px-5 py-2.5 text-text2 font-medium">Contenu</th>
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
    </div>

    {#if selected}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-10"
           onclick={(e) => { if (e.target === e.currentTarget) selected = null; }}
           transition:fade={{ duration: 150 }}>
        <div class="w-full max-w-3xl max-h-[80vh] bg-surface border border-border2 rounded-xl flex flex-col shadow-2xl overflow-hidden"
             transition:fly={{ y: 16, duration: 200 }}>
          <div class="flex items-center gap-3 px-5 py-3 border-b border-border flex-shrink-0">
            <span class="inline-block px-2 py-0.5 rounded-full text-[10px] border {BADGE_COLOR[selected.role] ?? 'text-text2 border-border2'}">
              {selected.role}
            </span>
            <span class="font-mono text-xs text-text2">{fmt(selected.ts)}</span>
            <div class="flex-1"></div>
            <button class="text-text2 hover:text-text1 font-mono text-base leading-none transition-colors"
                    onclick={() => selected = null}>x</button>
          </div>
          <div class="flex-1 overflow-auto p-5">
            <pre class="font-mono text-xs text-text1 whitespace-pre-wrap break-words">{selected.content}</pre>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
