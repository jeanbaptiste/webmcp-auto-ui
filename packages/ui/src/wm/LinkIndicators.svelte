<script lang="ts">
  /**
   * LinkIndicators — visual indicators for linked widgets.
   *
   * Shows a colored left border + two action icons (focus group, show arrows)
   * when the widget has links on the FONC bus.
   *
   * Usage: place inside a title bar div. The component renders inline
   * (flex items) and is invisible when the widget has no links.
   *
   * Requires the bus to expose hasLinks/getLinks/getGroup (added by another agent).
   * Gracefully degrades if those methods don't exist yet.
   */
  import { bus } from '../messaging/bus.svelte.js';
  import { groupColor } from './link-utils.js';

  interface Props {
    /** The widget's bus ID */
    busId: string;
  }
  let { busId }: Props = $props();

  // ── Reactive link state (safe if bus methods don't exist yet) ──────
  const linked = $derived(
    typeof (bus as any).hasLinks === 'function' ? (bus as any).hasLinks(busId) : false
  );

  const links = $derived(
    typeof (bus as any).getLinks === 'function' ? (bus as any).getLinks(busId) : []
  );

  /** First group ID (a widget may belong to multiple groups) */
  const groupId = $derived.by((): string | null => {
    if (!Array.isArray(links) || links.length === 0) return null;
    // Each link has a groupId property
    const first = links[0];
    return typeof first === 'object' && first?.groupId ? String(first.groupId) : null;
  });

  const color = $derived(groupId ? groupColor(groupId) : 'transparent');

  // ── Toggle state for arrows ───────────────────────────────────────
  let showArrows = $state(false);

  // ── Actions ───────────────────────────────────────────────────────
  function focusGroup(e: MouseEvent) {
    e.stopPropagation();
    if (!groupId) return;
    bus.broadcast(busId, 'focus-group', { groupId });
  }

  function toggleArrows(e: MouseEvent) {
    e.stopPropagation();
    showArrows = !showArrows;
    if (!groupId) return;
    bus.broadcast(busId, 'show-links', { groupId, visible: showArrows });
  }
</script>

{#if linked}
  <!-- Focus group icon (layers/stack) -->
  <button
    class="link-indicator-btn"
    style="color:{color};"
    onclick={focusGroup}
    title="Focus linked widgets"
    aria-label="Focus linked widgets"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- Layers icon -->
      <path d="M12 2 2 7l10 5 10-5-10-5z"/>
      <path d="m2 17 10 5 10-5"/>
      <path d="m2 12 10 5 10-5"/>
    </svg>
  </button>

  <!-- Toggle arrows icon (link/branch) -->
  <button
    class="link-indicator-btn"
    class:active={showArrows}
    style="color:{color};"
    onclick={toggleArrows}
    title={showArrows ? 'Hide link arrows' : 'Show link arrows'}
    aria-label={showArrows ? 'Hide link arrows' : 'Show link arrows'}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- Link icon -->
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  </button>
{/if}

<style>
  .link-indicator-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 3px;
    border: none;
    background: transparent;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.15s, background 0.15s;
    flex-shrink: 0;
    padding: 0;
  }
  .link-indicator-btn:hover {
    opacity: 1;
    background: color-mix(in srgb, currentColor 12%, transparent);
  }
  .link-indicator-btn.active {
    opacity: 1;
    background: color-mix(in srgb, currentColor 18%, transparent);
  }
</style>
