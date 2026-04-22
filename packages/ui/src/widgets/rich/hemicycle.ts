/**
 * Vanilla renderer for the Hemicycle widget.
 *
 * Geometric calculations are preserved 1:1 from Hemicycle.svelte:
 *   - viewBox 420x230, cx=W/2, cy=H-10
 *   - rings: radii = rMin + i*step (rMin=60, step=28)
 *   - seats-per-row proportional to ring circumference (Math.PI*r)
 *   - groups sorted ascending by seat count, colors filled left->right
 *   - per-row angle: Math.PI - (j/(n-1||1))*Math.PI
 *   - seat position: cx + r*cos(angle), cy - r*sin(angle)
 *
 * Contract:
 *   export function render(container, data): () => void
 *   data = spec (HemicycleSpec)
 *
 * Interactions:
 *   - mouseenter/mouseleave on seats -> tooltip
 *   - dblclick on seat or legend item -> 'widget:interact' CustomEvent
 *     with detail { action: 'groupclick', payload: group }
 *   - keydown Enter on legend item -> same event
 */

export interface HemicycleGroup {
  id: string;
  label: string;
  seats: number;
  color: string;
}

export interface HemicycleSpec {
  title?: string;
  groups?: HemicycleGroup[];
  totalSeats?: number;
  rows?: number;
}

interface Seat {
  x: number;
  y: number;
  color: string;
  gid: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function dispatchGroupClick(container: HTMLElement, group: HemicycleGroup): void {
  container.dispatchEvent(
    new CustomEvent('widget:interact', {
      detail: { action: 'groupclick', payload: group },
      bubbles: true,
    }),
  );
}

function computeSeats(
  groups: HemicycleGroup[],
  total: number,
  rows: number,
  cx: number,
  cy: number,
  rMin: number,
  step: number,
): Seat[] {
  if (!groups.length || !total) return [];
  const radii = Array.from({ length: rows }, (_, i) => rMin + i * step);
  const circs = radii.map((r) => Math.PI * r);
  const totalC = circs.reduce((a, b) => a + b, 0);
  const spr = radii.map((r) => Math.round((Math.PI * r) / totalC * total));
  spr[spr.length - 1] += total - spr.reduce((a, b) => a + b, 0);
  const sorted = [...groups].sort((a, b) => a.seats - b.seats);
  const colors: { color: string; gid: string }[] = [];
  for (const g of sorted) for (let i = 0; i < g.seats; i++) colors.push({ color: g.color, gid: g.id });
  while (colors.length < total) colors.push({ color: '#333355', gid: '' });
  const result: Seat[] = [];
  let idx = 0;
  for (let row = 0; row < rows; row++) {
    const r = radii[row];
    const n = spr[row];
    for (let j = 0; j < n; j++) {
      if (idx >= colors.length) break;
      const angle = Math.PI - (j / (n - 1 || 1)) * Math.PI;
      result.push({
        x: cx + r * Math.cos(angle),
        y: cy - r * Math.sin(angle),
        ...colors[idx++],
      });
    }
  }
  return result;
}

export function render(container: HTMLElement, data: any): () => void {
  const spec: Partial<HemicycleSpec> = (data ?? {}) as Partial<HemicycleSpec>;
  const groups: HemicycleGroup[] = Array.isArray(spec.groups) ? spec.groups : [];
  const total = spec.totalSeats ?? groups.reduce((s, g) => s + g.seats, 0);

  const W = 420;
  const H = 230;
  const cx = W / 2;
  const cy = H - 10;
  const rMin = 60;
  const step = 28;
  const rows = spec.rows ?? Math.min(Math.max(3, Math.ceil(Math.sqrt(total / 6))), 7);
  const rMax = rMin + rows * step;

  // Cleanup any prior content
  container.innerHTML = '';

  const cleanups: Array<() => void> = [];
  const addListener = <K extends keyof HTMLElementEventMap>(
    el: Element,
    type: string,
    handler: EventListener,
  ) => {
    el.addEventListener(type, handler);
    cleanups.push(() => el.removeEventListener(type, handler));
  };

  // Root card
  const root = document.createElement('div');
  root.className = 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans';

  if (spec.title) {
    const h3 = document.createElement('h3');
    h3.className = 'text-sm font-semibold text-text1 mb-3';
    h3.textContent = spec.title;
    root.appendChild(h3);
  }

  if (!groups.length || !total) {
    const p = document.createElement('p');
    p.className = 'text-text2 text-sm';
    p.textContent = 'No data';
    root.appendChild(p);
    container.appendChild(root);
    return () => {
      for (const c of cleanups) c();
      container.innerHTML = '';
    };
  }

  const seats = computeSeats(groups, total, rows, cx, cy, rMin, step);
  const legend = [...groups].sort((a, b) => b.seats - a.seats);

  // SVG container (relative wrapper for tooltip positioning)
  const svgWrap = document.createElement('div');
  svgWrap.className = 'relative';

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('class', 'block w-full max-h-[220px]');

  // Backdrop arc
  const arc = document.createElementNS(SVG_NS, 'path');
  arc.setAttribute(
    'd',
    `M ${cx - rMax - 15} ${cy} A ${rMax + 15} ${rMax + 15} 0 0 1 ${cx + rMax + 15} ${cy}`,
  );
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', 'var(--color-surface2)');
  arc.setAttribute('stroke-width', '2');
  svg.appendChild(arc);

  // Tooltip DOM (created eagerly, toggled via hidden)
  const tooltip = document.createElement('div');
  tooltip.className =
    'absolute top-0 right-0 bg-surface2 border border-border2 rounded px-2 py-1 text-xs text-text1 pointer-events-none';
  tooltip.style.display = 'none';
  const tooltipLabel = document.createElement('span');
  tooltipLabel.className = 'font-semibold';
  const tooltipSep = document.createTextNode(' — ');
  const tooltipSeats = document.createTextNode('');
  tooltip.appendChild(tooltipLabel);
  tooltip.appendChild(tooltipSep);
  tooltip.appendChild(tooltipSeats);

  const showTooltip = (gid: string) => {
    const g = groups.find((x) => x.id === gid);
    if (!g) return;
    tooltipLabel.textContent = g.label;
    tooltipSeats.textContent = String(g.seats);
    tooltip.style.display = '';
  };
  const hideTooltip = () => {
    tooltip.style.display = 'none';
  };

  // Seats
  for (const s of seats) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', s.x.toFixed(1));
    c.setAttribute('cy', s.y.toFixed(1));
    c.setAttribute('r', '4');
    c.setAttribute('fill', s.color);
    c.setAttribute('opacity', '0.9');
    if (s.gid) {
      c.setAttribute('class', 'cursor-pointer');
      const title = document.createElementNS(SVG_NS, 'title');
      title.textContent = 'Double-click to interact';
      c.appendChild(title);

      const gid = s.gid;
      const onEnter = () => showTooltip(gid);
      const onLeave = () => hideTooltip();
      const onDbl = () => {
        const g = groups.find((x) => x.id === gid);
        if (g) dispatchGroupClick(container, g);
      };
      addListener(c, 'mouseenter', onEnter);
      addListener(c, 'mouseleave', onLeave);
      addListener(c, 'dblclick', onDbl);
    }
    svg.appendChild(c);
  }

  // Total seats label
  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('x', String(cx));
  label.setAttribute('y', String(cy + 18));
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('font-size', '11');
  label.setAttribute('fill', 'var(--color-text2)');
  label.setAttribute('font-family', 'system-ui');
  label.textContent = `${total} seats`;
  svg.appendChild(label);

  svgWrap.appendChild(svg);
  svgWrap.appendChild(tooltip);
  root.appendChild(svgWrap);

  // Legend
  const legendWrap = document.createElement('div');
  legendWrap.className = 'flex flex-wrap gap-x-4 gap-y-1 mt-3';
  for (const g of legend) {
    const item = document.createElement('div');
    item.className = 'flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('title', 'Double-click to interact');

    const swatch = document.createElement('div');
    swatch.className = 'w-3 h-3 rounded-full flex-shrink-0';
    swatch.style.background = g.color;

    const labelEl = document.createElement('span');
    labelEl.className = 'text-text2';
    labelEl.textContent = g.label;

    const seatsEl = document.createElement('span');
    seatsEl.className = 'text-text2';
    seatsEl.textContent = String(g.seats);

    item.appendChild(swatch);
    item.appendChild(labelEl);
    item.appendChild(seatsEl);

    const onDbl = () => dispatchGroupClick(container, g);
    const onKey = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter') dispatchGroupClick(container, g);
    };
    addListener(item, 'dblclick', onDbl);
    addListener(item, 'keydown', onKey);

    legendWrap.appendChild(item);
  }
  root.appendChild(legendWrap);

  container.appendChild(root);

  // High-res SVG -> PNG export hook
  (container as any).__exportPng = async (scale = 2): Promise<string | null> => {
    try {
      const svgEl = container.querySelector('svg');
      if (!svgEl) return null;
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', SVG_NS);
      if (!clone.getAttribute('width')) clone.setAttribute('width', String(W));
      if (!clone.getAttribute('height')) clone.setAttribute('height', String(H));
      const xml = new XMLSerializer().serializeToString(clone);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const src = `data:image/svg+xml;base64,${svg64}`;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
        img.src = src;
      });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(W * scale);
      canvas.height = Math.round(H * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, W, H);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  return () => {
    for (const c of cleanups) c();
    try {
      delete (container as any).__exportPng;
    } catch {
      /* ignore */
    }
    container.innerHTML = '';
  };
}
