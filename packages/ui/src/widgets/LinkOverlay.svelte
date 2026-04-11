<script lang="ts">
  import { onDestroy } from 'svelte';
  import { bus } from '../messaging/bus.svelte.js';

  // ── Types ──────────────────────────────────────────────────────────────────
  interface Arrow {
    id: string;
    x1: number; y1: number;
    x2: number; y2: number;
    cx1: number; cy1: number;
    cx2: number; cy2: number;
    mx: number; my: number;
    color: string;
    label: string;
  }

  // ── State ──────────────────────────────────────────────────────────────────
  /** Map of groupId -> true when that group's links are visible */
  let visibleGroups = $state<Map<string, boolean>>(new Map());
  let arrows = $state<Arrow[]>([]);
  let visible = $derived(visibleGroups.size > 0 && arrows.length > 0);

  // ── Color from groupId (deterministic HSL) ─────────────────────────────────
  function groupColor(groupId: string): string {
    let h = 0;
    for (let i = 0; i < groupId.length; i++) {
      h = ((h << 5) - h + groupId.charCodeAt(i)) | 0;
    }
    h = ((h % 360) + 360) % 360;
    return `hsl(${h}, 70%, 55%)`;
  }

  // ── Arrow computation ──────────────────────────────────────────────────────
  function computeArrows(): Arrow[] {
    const result: Arrow[] = [];
    let idx = 0;

    for (const [groupId] of visibleGroups) {
      const widgetIds = bus.getGroup(groupId);
      if (widgetIds.length < 2) continue;

      const color = groupColor(groupId);

      // Get bounding rects for all widgets in the group
      const rects = new Map<string, DOMRect>();
      for (const wid of widgetIds) {
        const el = document.querySelector(`[data-block-id="${wid}"]`) as HTMLElement | null;
        if (el) rects.set(wid, el.getBoundingClientRect());
      }

      // Draw an arrow between each pair
      const ids = Array.from(rects.keys());
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const r1 = rects.get(ids[i])!;
          const r2 = rects.get(ids[j])!;

          const x1 = r1.left + r1.width / 2;
          const y1 = r1.top + r1.height / 2;
          const x2 = r2.left + r2.width / 2;
          const y2 = r2.top + r2.height / 2;

          // Bezier control points: offset perpendicular to the line
          const dx = x2 - x1;
          const dy = y2 - y1;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          // Perpendicular offset scaled by pair index to avoid overlap
          const offset = 30 + idx * 8;
          const nx = -dy / dist;
          const ny = dx / dist;

          const cx1 = x1 + dx * 0.3 + nx * offset;
          const cy1 = y1 + dy * 0.3 + ny * offset;
          const cx2 = x1 + dx * 0.7 + nx * offset;
          const cy2 = y1 + dy * 0.7 + ny * offset;

          // Label midpoint (on the curve, approx)
          const mx = (x1 + x2) / 2 + nx * offset * 0.5;
          const my = (y1 + y2) / 2 + ny * offset * 0.5;

          result.push({
            id: `${groupId}_${ids[i]}_${ids[j]}`,
            x1, y1, x2, y2,
            cx1, cy1, cx2, cy2,
            mx, my,
            color,
            label: groupId.replace(/^_grp_/, ''),
          });
          idx++;
        }
      }
    }

    return result;
  }

  // ── Bus listeners ──────────────────────────────────────────────────────────
  const unsubShowLinks = bus.subscribe(['show-links'], (msg) => {
    const payload = msg.payload as { groupId?: string; visible?: boolean } | undefined;
    if (!payload?.groupId) return;

    const next = new Map(visibleGroups);
    if (payload.visible === false) {
      next.delete(payload.groupId);
    } else {
      next.set(payload.groupId, true);
    }
    visibleGroups = next;
  });

  const unsubLink = bus.subscribe(['link'], () => {
    // Links changed — recompute if we have visible groups
    if (visibleGroups.size > 0) {
      arrows = computeArrows();
    }
  });

  onDestroy(() => {
    unsubShowLinks();
    unsubLink();
  });

  // ── Reactivity: recompute arrows when visible groups change ────────────────
  $effect(() => {
    // Read visibleGroups to track dependency
    const _size = visibleGroups.size;
    if (_size === 0) {
      arrows = [];
      return;
    }

    // Poll positions with rAF to track window movement
    let active = true;
    function tick() {
      if (!active) return;
      arrows = computeArrows();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    return () => { active = false; };
  });
</script>

{#if visible}
  <svg
    class="link-overlay"
    xmlns="http://www.w3.org/2000/svg"
  >
    {#each arrows as arrow (arrow.id)}
      <defs>
        <marker
          id="arrowhead-{arrow.id}"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill={arrow.color} />
        </marker>
      </defs>
      <path
        d="M {arrow.x1} {arrow.y1} C {arrow.cx1} {arrow.cy1}, {arrow.cx2} {arrow.cy2}, {arrow.x2} {arrow.y2}"
        stroke={arrow.color}
        stroke-width="2"
        fill="none"
        stroke-dasharray="6 3"
        marker-end="url(#arrowhead-{arrow.id})"
        opacity="0.7"
        class="link-arrow"
      />
      <text
        x={arrow.mx}
        y={arrow.my}
        fill={arrow.color}
        font-size="11"
        text-anchor="middle"
        opacity="0.8"
        class="link-label"
      >
        {arrow.label}
      </text>
    {/each}
  </svg>
{/if}

<style>
  .link-overlay {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    overflow: visible;
  }

  .link-arrow {
    animation: fade-in 0.25s ease-out;
  }

  .link-label {
    animation: fade-in 0.25s ease-out;
    pointer-events: none;
    user-select: none;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
