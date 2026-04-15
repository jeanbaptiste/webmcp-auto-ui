<script lang="ts">
  import { getExportFormats, exportWidgetAs, type ExportFormat } from './export-widget.js';

  interface Props {
    open: boolean;
    type: string;
    data: Record<string, unknown>;
    containerEl?: HTMLElement;
    onclose?: () => void;
  }

  let { open = $bindable(false), type, data, containerEl, onclose }: Props = $props();

  const formats = $derived(open ? getExportFormats(type, containerEl) : []);

  function doExport(fmt: ExportFormat) {
    exportWidgetAs(fmt.id, type, data, containerEl);
    open = false;
    onclose?.();
  }

  function handleBackdrop() {
    open = false;
    onclose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
      onclose?.();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="export-modal-backdrop" onclick={handleBackdrop} onkeydown={handleKeydown}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="export-modal" onclick={(e) => e.stopPropagation()}>
      <div class="export-modal-title">Exporter — {type}</div>
      <div class="export-modal-list">
        {#each formats as fmt}
          <button class="export-modal-btn" onclick={() => doExport(fmt)}>
            <span class="export-modal-icon">{fmt.icon}</span>
            <span class="export-modal-label">{fmt.label}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .export-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.35);
  }
  .export-modal {
    background: var(--color-surface, #1a1a2e);
    border: 1px solid var(--color-border, #333);
    border-radius: 8px;
    padding: 12px;
    max-width: 250px;
    width: 100%;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    font-family: var(--font-mono, ui-monospace, monospace);
  }
  .export-modal-title {
    font-size: 11px;
    color: var(--color-text2, #888);
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--color-border, #333);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .export-modal-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .export-modal-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text1, #eee);
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .export-modal-btn:hover {
    background: var(--color-surface2, #2a2a3e);
    border-color: var(--color-border, #444);
  }
  .export-modal-icon {
    font-size: 16px;
    flex-shrink: 0;
    width: 20px;
    text-align: center;
  }
  .export-modal-label {
    flex: 1;
    text-align: left;
  }
</style>
