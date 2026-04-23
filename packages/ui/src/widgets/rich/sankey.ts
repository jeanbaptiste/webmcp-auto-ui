/**
 * Sankey (simulated) — vanilla renderer.
 *
 * Contract:
 *   render(container, spec): () => void
 *
 * Emits on `container`:
 *   - CustomEvent 'widget:interact' { detail: { action: 'nodeclick', payload: node }, bubbles: true }
 *   - CustomEvent 'widget:interact' { detail: { action: 'linkclick', payload: link }, bubbles: true }
 *   - CustomEvent 'widget:interact' { detail: { action: 'node-dblclick', payload: node }, bubbles: true }
 *
 * Not a real d3-sankey layout — horizontal "bar" visualization sorted by value,
 * matching the historical Svelte widget (Sankey.svelte).
 */

export interface SankeyNode {
  id: string;
  label: string;
  color?: string;
  summary?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  label?: string;
}

export interface SankeySpec {
  title?: string;
  nodes?: SankeyNode[];
  links?: SankeyLink[];
}

type Cleanup = () => void;

function emitInteract(
  container: HTMLElement,
  action: 'nodeclick' | 'linkclick' | 'node-dblclick',
  payload: unknown,
): void {
  container.dispatchEvent(
    new CustomEvent('widget:interact', {
      detail: { action, payload },
      bubbles: true,
    }),
  );
}

function emitNodeDblclick(container: HTMLElement, node: SankeyNode): void {
  emitInteract(container, 'node-dblclick', node);
}

export function render(container: HTMLElement, data: unknown): Cleanup {
  const spec: Partial<SankeySpec> =
    data && typeof data === 'object' ? (data as Partial<SankeySpec>) : {};

  const nodes: SankeyNode[] = Array.isArray(spec.nodes) ? spec.nodes! : [];
  const links: SankeyLink[] = Array.isArray(spec.links) ? spec.links! : [];

  // Clear container.
  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans';
  container.appendChild(root);

  if (spec.title) {
    const h = document.createElement('h3');
    h.className = 'text-sm font-semibold text-text1 mb-3';
    h.textContent = String(spec.title);
    root.appendChild(h);
  }

  // Empty state.
  if (!nodes.length || !links.length) {
    const p = document.createElement('p');
    p.className = 'text-text2 text-sm';
    p.textContent = 'No flow data';
    root.appendChild(p);

    const cleanupEmpty: Cleanup = () => {
      container.innerHTML = '';
    };
    // PNG export — empty placeholder.
    (container as unknown as { __exportPng?: () => Promise<Blob | null> }).__exportPng =
      async () => null;
    return cleanupEmpty;
  }

  const nodeMap = new Map<string, SankeyNode>(nodes.map((n) => [n.id, n]));
  const maxVal = Math.max(...links.map((l) => l.value), 1);
  const sorted = [...links].sort((a, b) => b.value - a.value);

  // Counts line.
  const counts = document.createElement('div');
  counts.className = 'text-xs text-text2 mb-2 font-mono';
  counts.textContent = `${nodes.length} nodes · ${links.length} flows`;
  root.appendChild(counts);

  const list = document.createElement('div');
  list.className = 'flex flex-col gap-1.5';
  root.appendChild(list);

  // Track attached listeners for cleanup.
  type Binding = { el: Element; type: string; fn: EventListener };
  const bindings: Binding[] = [];
  const on = (el: Element, type: string, fn: EventListener) => {
    el.addEventListener(type, fn);
    bindings.push({ el, type, fn });
  };

  for (const link of sorted) {
    const src = nodeMap.get(link.source);
    const tgt = nodeMap.get(link.target);
    const sc = src?.color ?? 'var(--color-accent)';
    const tc = tgt?.color ?? 'var(--color-teal)';
    const pct = Math.round((link.value / maxVal) * 100);
    const barH = Math.max(4, Math.round((link.value / maxVal) * 20));

    const row = document.createElement('div');
    row.className =
      'flex items-center gap-2 text-xs cursor-pointer hover:opacity-80 transition-opacity';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');

    const onLinkActivate = () => emitInteract(container, 'linkclick', link);
    on(row, 'click', onLinkActivate as EventListener);
    on(row, 'keydown', ((e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter' || ke.key === ' ') {
        ke.preventDefault();
        onLinkActivate();
      }
    }) as EventListener);

    // Source label.
    const srcSpan = document.createElement('span');
    srcSpan.className = 'text-text2 min-w-[80px] truncate font-mono';
    srcSpan.style.color = sc;
    srcSpan.title = src?.summary ?? src?.label ?? link.source;
    srcSpan.textContent = src?.label ?? link.source;
    if (src) {
      on(srcSpan, 'dblclick', ((e: Event) => {
        e.stopPropagation();
        emitNodeDblclick(container, src);
        emitInteract(container, 'nodeclick', src);
      }) as EventListener);
    }
    row.appendChild(srcSpan);

    // Bar.
    const barWrap = document.createElement('div');
    barWrap.className = 'flex-1 bg-surface2 rounded-full overflow-hidden';
    barWrap.style.height = `${barH}px`;
    const bar = document.createElement('div');
    bar.className = 'rounded-full h-full';
    bar.style.width = `${pct}%`;
    bar.style.background = `linear-gradient(to right, ${sc}, ${tc})`;
    barWrap.appendChild(bar);
    row.appendChild(barWrap);

    // Target label.
    const tgtSpan = document.createElement('span');
    tgtSpan.className = 'text-text2 min-w-[80px] truncate text-right font-mono';
    tgtSpan.style.color = tc;
    tgtSpan.title = tgt?.summary ?? tgt?.label ?? link.target;
    tgtSpan.textContent = tgt?.label ?? link.target;
    if (tgt) {
      on(tgtSpan, 'dblclick', ((e: Event) => {
        e.stopPropagation();
        emitNodeDblclick(container, tgt);
        emitInteract(container, 'nodeclick', tgt);
      }) as EventListener);
    }
    row.appendChild(tgtSpan);

    // Value.
    const val = document.createElement('span');
    val.className = 'text-text2 min-w-[40px] text-right font-mono';
    val.textContent = String(link.value);
    row.appendChild(val);

    list.appendChild(row);
  }

  // Optional PNG export — rasterize the root via html2canvas-less approach:
  // use foreignObject inside an SVG, then draw to canvas.
  (container as unknown as { __exportPng?: () => Promise<Blob | null> }).__exportPng =
    async () => {
      try {
        const rect = root.getBoundingClientRect();
        const w = Math.max(1, Math.ceil(rect.width));
        const h = Math.max(1, Math.ceil(rect.height));
        const xmlns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(xmlns, 'svg');
        svg.setAttribute('xmlns', xmlns);
        svg.setAttribute('width', String(w));
        svg.setAttribute('height', String(h));
        const fo = document.createElementNS(xmlns, 'foreignObject');
        fo.setAttribute('width', '100%');
        fo.setAttribute('height', '100%');
        const clone = root.cloneNode(true) as HTMLElement;
        // Embed clone inside a namespaced div so the browser renders HTML.
        const wrap = document.createElement('div');
        wrap.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        wrap.appendChild(clone);
        fo.appendChild(wrap);
        svg.appendChild(fo);
        const svgStr = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        try {
          const img = new Image();
          img.decoding = 'sync';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('svg load failed'));
            img.src = url;
          });
          const scale = Math.min(2, (globalThis.devicePixelRatio as number) || 1);
          const canvas = document.createElement('canvas');
          canvas.width = w * scale;
          canvas.height = h * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          return await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), 'image/png'),
          );
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch {
        return null;
      }
    };

  const cleanup: Cleanup = () => {
    for (const { el, type, fn } of bindings) {
      el.removeEventListener(type, fn);
    }
    bindings.length = 0;
    try {
      delete (container as unknown as { __exportPng?: unknown }).__exportPng;
    } catch {
      /* noop */
    }
    container.innerHTML = '';
  };

  return cleanup;
}

export default { render };
