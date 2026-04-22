<script lang="ts">
  /**
   * DataServersPanel — manages the list of data (MCP) servers in the canvas store.
   *
   * Reads/writes through `canvas.dataServers` (reactive, Svelte 5 runes wrapper).
   * A companion `MultiMcpBridge` (installed in the app root) observes the store
   * and connects/disconnects servers according to their `enabled` flag.
   *
   * Visual state per server:
   *   - disabled           : grey dot
   *   - enabled + !connected : yellow dot (connecting)
   *   - enabled + connected : green dot (ok)
   *   - error              : red dot with tooltip
   */
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';

  let connectOpen = $state(false);
  let newName = $state('');
  let newUrl = $state('');
  let formError = $state<string | null>(null);
  let nameInputEl: HTMLInputElement | null = $state(null);

  function openModal() {
    connectOpen = true;
    formError = null;
    // Focus the name field once the modal mounts.
    queueMicrotask(() => nameInputEl?.focus());
  }

  function closeModal() {
    connectOpen = false;
    newName = '';
    newUrl = '';
    formError = null;
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && connectOpen) {
      e.preventDefault();
      closeModal();
    }
  }

  function submitConnect(e?: Event) {
    e?.preventDefault();
    const name = newName.trim();
    const url = newUrl.trim();
    if (!name) { formError = 'Name required'; return; }
    if (canvas.getDataServer(name)) { formError = 'A server with this name already exists'; return; }
    try { new URL(url); } catch { formError = 'Invalid URL'; return; }
    canvas.addDataServer({ name, url });
    // addDataServer initialises enabled=true; the bridge will pick it up.
    closeModal();
  }
</script>

<svelte:window onkeydown={onKey} />

<section class="flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Data servers</span>
    <button
      type="button"
      class="font-mono text-[10px] h-6 px-2 rounded border border-accent/40 text-accent hover:bg-accent/10 transition-colors"
      onclick={openModal}
    >
      + Connect
    </button>
  </div>

  {#if canvas.dataServers.length === 0}
    <div class="text-[10px] font-mono text-text2/50 italic">No data servers connected.</div>
  {:else}
    <ul class="flex flex-col gap-1">
      {#each canvas.dataServers as s (s.name)}
        <li class="flex items-center gap-2 px-2 py-1.5 rounded border border-border2/60 bg-surface2/40">
          <label class="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
            <input
              type="checkbox"
              class="accent-accent w-3.5 h-3.5 flex-shrink-0"
              checked={s.enabled}
              onchange={() => canvas.toggleDataServer(s.name)}
              aria-label={`Toggle ${s.name}`}
            />
            <span
              class="w-1.5 h-1.5 rounded-full flex-shrink-0
                     {s.error ? 'bg-accent2'
                      : !s.enabled ? 'bg-text2/40'
                      : s.connected ? 'bg-teal'
                      : 'bg-amber animate-pulse'}"
              title={s.error
                ? `Error: ${s.error}`
                : !s.enabled ? 'Disabled'
                : s.connected ? 'Connected'
                : 'Connecting…'}
            ></span>
            <span class="font-mono text-xs text-text1 truncate" title={s.url}>{s.name}</span>
            {#if s.tools && s.tools.length > 0}
              <span class="font-mono text-[9px] text-text2/60 flex-shrink-0">{s.tools.length} tools</span>
            {/if}
          </label>
          <button
            type="button"
            class="text-text2/60 hover:text-accent2 transition-colors flex-shrink-0 text-sm leading-none px-1"
            onclick={() => canvas.removeDataServer(s.name)}
            aria-label={`Remove ${s.name}`}
            title="Remove"
          >&times;</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

{#if connectOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
    onclick={closeModal}
  >
    <form
      class="w-full max-w-sm bg-surface border border-border2 rounded-lg shadow-xl p-5 flex flex-col gap-3"
      onclick={(e) => e.stopPropagation()}
      onsubmit={submitConnect}
    >
      <h4 class="font-mono text-sm font-bold text-text1">Connect data server</h4>
      <label class="flex flex-col gap-1">
        <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Name</span>
        <input
          bind:this={nameInputEl}
          bind:value={newName}
          type="text"
          placeholder="tricoteuses"
          required
          class="font-mono text-xs h-7 px-2 rounded border border-border2 bg-surface2 text-text1"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">URL</span>
        <input
          bind:value={newUrl}
          type="url"
          placeholder="https://mcp.example.com/mcp"
          required
          class="font-mono text-xs h-7 px-2 rounded border border-border2 bg-surface2 text-text1"
        />
      </label>
      {#if formError}
        <div class="font-mono text-[10px] text-accent2">{formError}</div>
      {/if}
      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          class="font-mono text-xs h-7 px-3 rounded border border-border2 text-text2 hover:text-text1 transition-colors"
          onclick={closeModal}
        >Cancel</button>
        <button
          type="submit"
          class="font-mono text-xs h-7 px-3 rounded border border-accent/40 text-accent hover:bg-accent/10 transition-colors"
        >Connect</button>
      </div>
    </form>
  </div>
{/if}
