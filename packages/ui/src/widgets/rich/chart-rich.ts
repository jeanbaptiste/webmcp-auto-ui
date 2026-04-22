/**
 * Chart — vanilla renderer
 * Ports Chart.svelte (pie/donut/bar/line/area) to imperative DOM + SVG.
 * Contract: render(container, spec) -> cleanup()
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ChartDataset {
  label?: string;
  values: number[];
  color?: string;
}

export interface ChartSpec {
  title?: string;
  type?: 'bar' | 'line' | 'area' | 'pie' | 'donut';
  labels?: string[];
  data?: ChartDataset[];
  legend?: boolean;
  xAxis?: { label?: string };
  yAxis?: { label?: string };
}

const PAL = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7',
  '#eab308', '#3b82f6', '#22c55e', '#e11d48', '#0ea5e9',
];

const fmt = new Intl.NumberFormat('fr-FR');

function col(ds: ChartDataset, i: number): string {
  return ds.color ?? PAL[i % PAL.length];
}

function arc(cx: number, cy: number, r: number, start: number, end: number, ir = 0): string {
  const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
  const large = end - start > Math.PI ? 1 : 0;
  if (ir > 0) {
    const ix1 = cx + ir * Math.cos(end), iy1 = cy + ir * Math.sin(end);
    const ix2 = cx + ir * Math.cos(start), iy2 = cy + ir * Math.sin(start);
    return `M${x1},${y1}A${r},${r},0,${large},1,${x2},${y2}L${ix1},${iy1}A${ir},${ir},0,${large},0,${ix2},${iy2}Z`;
  }
  return `M${cx},${cy}L${x1},${y1}A${r},${r},0,${large},1,${x2},${y2}Z`;
}

interface Slice {
  label: string;
  value: number;
  color: string;
  startAngle: number;
  endAngle: number;
  pct: number;
}

function computeSlices(datasets: ChartDataset[], xLabels: string[]): Slice[] {
  if (!datasets.length) return [];
  const ds = datasets[0];
  const tot = (ds.values ?? []).reduce((a, b) => a + b, 0) || 1;
  let angle = -Math.PI / 2;
  return (ds.values ?? []).map((v, i) => {
    const pct = v / tot;
    const start = angle;
    angle += pct * 2 * Math.PI;
    return {
      label: xLabels[i] ?? String(i),
      value: v,
      color: col(ds, i),
      startAngle: start,
      endAngle: angle,
      pct,
    };
  });
}

function h(tag: string, attrs?: Record<string, string>, children?: (Node | string)[]): HTMLElement {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (children) for (const c of children) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

function s(tag: string, attrs?: Record<string, string>, children?: (Node | string)[]): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (children) for (const c of children) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

function dispatchInteract(container: HTMLElement, action: string, payload: any) {
  container.dispatchEvent(new CustomEvent('widget:interact', {
    detail: { action, payload },
    bubbles: true,
  }));
}

/**
 * Serialize the chart SVG to a PNG Blob at the given scale.
 * Falls back to an empty 1x1 PNG if no SVG is present (e.g. bar chart pure-DOM).
 */
function makeExportPng(container: HTMLElement) {
  return async (scale = 2): Promise<Blob> => {
    const svg = container.querySelector('svg');
    if (!svg) {
      // no SVG (bar chart). Rasterize via html2canvas-like minimal fallback: blank blob.
      const c = document.createElement('canvas');
      c.width = 1; c.height = 1;
      return await new Promise<Blob>((resolve) => c.toBlob(b => resolve(b!), 'image/png')!);
    }
    const clone = svg.cloneNode(true) as SVGElement;
    const bbox = svg.getBoundingClientRect();
    const w = Math.max(1, Math.round(bbox.width));
    const hh = Math.max(1, Math.round(bbox.height));
    clone.setAttribute('xmlns', SVG_NS);
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(hh));
    const xml = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('svg img load failed'));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = hh * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, hh);
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  };
}

export function render(container: HTMLElement, data: any): () => void {
  const spec: Partial<ChartSpec> = (data ?? {}) as Partial<ChartSpec>;
  const datasets: ChartDataset[] = Array.isArray(spec.data) ? spec.data : [];
  const labels: string[] = Array.isArray(spec.labels) ? spec.labels : [];
  const type = spec.type ?? 'bar';
  const isPie = type === 'pie' || type === 'donut';
  const allVals = datasets.flatMap(d => d.values ?? []);
  const maxVal = Math.max(...allVals.filter(v => typeof v === 'number'), 1);
  const xLabels: string[] = labels.length > 0
    ? labels
    : (datasets[0]?.values ?? []).map((_: number, i: number) => String(i + 1));
  const showLegend = spec.legend !== false && datasets.length > 1;
  const isCategoricalBar = type === 'bar' && datasets.length === 1;
  const isCategoricalLine = (type === 'line' || type === 'area') && datasets.length === 1;
  const barCol = (ds: ChartDataset, di: number, xi: number) =>
    isCategoricalBar ? PAL[xi % PAL.length] : col(ds, di);

  // Cleanup tracking.
  const listeners: Array<{ el: EventTarget; type: string; fn: EventListener }> = [];
  const on = (el: EventTarget, t: string, fn: EventListener) => {
    el.addEventListener(t, fn);
    listeners.push({ el, type: t, fn });
  };

  container.innerHTML = '';
  const root = h('div', { class: 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans' });

  if (spec.title) {
    root.appendChild(h('h3', { class: 'text-sm font-semibold text-text1 mb-3' }, [spec.title]));
  }

  if (!datasets.length) {
    root.appendChild(h('p', { class: 'text-text2 text-sm' }, ['No data']));
    container.appendChild(root);
    (container as any).__exportPng = makeExportPng(container);
    return () => {
      for (const l of listeners) l.el.removeEventListener(l.type, l.fn);
      listeners.length = 0;
      container.innerHTML = '';
      delete (container as any).__exportPng;
    };
  }

  // Tooltip element (shared across hoverables in this render).
  const tooltipEl = h('div', { class: 'mt-2 text-xs text-text2 font-mono', style: 'display:none;' });

  if (isPie) {
    const slices = computeSlices(datasets, xLabels);
    const wrapper = h('div', { class: 'relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6' });
    const svg = s('svg', {
      viewBox: '-1 -1 2 2',
      class: 'w-40 h-40 flex-shrink-0',
      xmlns: SVG_NS,
    });
    slices.forEach((sl, i) => {
      const path = s('path', {
        d: arc(0, 0, 0.9, sl.startAngle, sl.endAngle, type === 'donut' ? 0.5 : 0),
        fill: sl.color,
        opacity: '0.85',
        class: 'cursor-pointer hover:opacity-100 transition-opacity',
        role: 'img',
        'aria-label': `${sl.label}: ${fmt.format(sl.value)} (${Math.round(sl.pct * 100)}%)`,
      });
      const enter = () => {
        tooltipEl.textContent = `${sl.label}: ${fmt.format(sl.value)} (${Math.round(sl.pct * 100)}%)`;
        tooltipEl.style.display = '';
        dispatchInteract(container, 'chart:hover', { index: i, label: sl.label, value: sl.value, pct: sl.pct });
      };
      const leave = () => {
        tooltipEl.textContent = '';
        tooltipEl.style.display = 'none';
      };
      const click = () => dispatchInteract(container, 'chart:click', { index: i, label: sl.label, value: sl.value, pct: sl.pct });
      on(path, 'mouseenter', enter);
      on(path, 'mouseleave', leave);
      on(path, 'click', click);
      svg.appendChild(path);
    });
    wrapper.appendChild(svg);

    const legend = h('div', { class: 'flex flex-col gap-1.5 text-xs' });
    for (const sl of slices) {
      const row = h('div', { class: 'flex items-center gap-1.5' });
      row.appendChild(h('div', { class: 'w-2.5 h-2.5 rounded-full flex-shrink-0', style: `background:${sl.color};` }));
      row.appendChild(h('span', { class: 'text-text2' }, [sl.label]));
      row.appendChild(h('span', { class: 'text-text2 ml-1' }, [`${Math.round(sl.pct * 100)}%`]));
      legend.appendChild(row);
    }
    wrapper.appendChild(legend);
    root.appendChild(wrapper);
    root.appendChild(tooltipEl);
  } else {
    const chartWrap = h('div', { class: 'relative' });

    if (type === 'bar') {
      const barsRow = h('div', { class: 'flex items-end gap-1 h-24 sm:h-32 mb-1' });
      xLabels.forEach((lbl, xi) => {
        const cell = h('div', { class: 'flex-1 flex gap-0.5 items-end h-full' });
        datasets.forEach((ds, di) => {
          const v = ds.values[xi] ?? 0;
          const pct = Math.round((v / maxVal) * 100);
          const bar = h('div', {
            class: 'flex-1 rounded-t transition-all hover:opacity-80 cursor-default',
            style: `height:${pct}%;background:${barCol(ds, di, xi)};`,
            title: `${ds.label ?? ''} ${lbl}: ${fmt.format(v)}`,
            role: 'img',
            'aria-label': `${ds.label ?? ''} ${lbl}: ${fmt.format(v)}`,
          });
          const enter = () => {
            tooltipEl.textContent = `${ds.label ?? ''} ${lbl}: ${fmt.format(v)}`;
            tooltipEl.style.display = '';
            dispatchInteract(container, 'chart:hover', { series: di, index: xi, label: lbl, value: v });
          };
          const leave = () => {
            tooltipEl.textContent = '';
            tooltipEl.style.display = 'none';
          };
          const click = () => dispatchInteract(container, 'chart:click', { series: di, index: xi, label: lbl, value: v });
          on(bar, 'mouseenter', enter);
          on(bar, 'mouseleave', leave);
          on(bar, 'click', click);
          cell.appendChild(bar);
        });
        barsRow.appendChild(cell);
      });
      chartWrap.appendChild(barsRow);

      const xRow = h('div', { class: 'flex gap-1 mb-2' });
      for (const lbl of xLabels) {
        xRow.appendChild(h('div', { class: 'flex-1 text-center text-[9px] font-mono text-text2 truncate' }, [lbl]));
      }
      chartWrap.appendChild(xRow);
    } else {
      // line or area
      const W = 400, H = 120, pad = 10;
      const svg = s('svg', {
        viewBox: `0 0 ${W} ${H}`,
        class: 'w-full',
        xmlns: SVG_NS,
      });
      datasets.forEach((ds, di) => {
        const n = ds.values.length;
        const step = (W - pad * 2) / (n - 1 || 1);
        const pts = ds.values.map((v, i) => `${pad + i * step},${H - pad - (v / maxVal) * (H - pad * 2)}`);
        if (type === 'area') {
          const lastX = pad + (n - 1) * step;
          svg.appendChild(s('polygon', {
            points: `${pad},${H - pad} ${pts.join(' ')} ${lastX},${H - pad}`,
            fill: col(ds, di),
            opacity: '0.15',
          }));
        }
        svg.appendChild(s('polyline', {
          points: pts.join(' '),
          fill: 'none',
          stroke: col(ds, di),
          'stroke-width': '2',
          'stroke-linejoin': 'round',
        }));
        ds.values.forEach((v, i) => {
          const cx = pad + i * step;
          const cy = H - pad - (v / maxVal) * (H - pad * 2);
          const circle = s('circle', {
            cx: String(cx),
            cy: String(cy),
            r: '4',
            fill: isCategoricalLine ? PAL[i % PAL.length] : col(ds, di),
            stroke: 'var(--color-surface, white)',
            'stroke-width': '1.5',
            role: 'img',
            'aria-label': `${ds.label ?? ''} ${xLabels[i] ?? i}: ${fmt.format(v)}`,
          });
          circle.style.cursor = 'pointer';
          const enter = () => {
            tooltipEl.textContent = `${ds.label ?? ''} ${xLabels[i] ?? i}: ${fmt.format(v)}`;
            tooltipEl.style.display = '';
            dispatchInteract(container, 'chart:hover', { series: di, index: i, label: xLabels[i], value: v });
          };
          const leave = () => {
            tooltipEl.textContent = '';
            tooltipEl.style.display = 'none';
          };
          const click = () => dispatchInteract(container, 'chart:click', { series: di, index: i, label: xLabels[i], value: v });
          on(circle, 'mouseenter', enter);
          on(circle, 'mouseleave', leave);
          on(circle, 'click', click);
          svg.appendChild(circle);
        });
      });
      chartWrap.appendChild(svg);

      const xRow = h('div', { class: 'flex gap-1' });
      for (const lbl of xLabels) {
        xRow.appendChild(h('div', { class: 'flex-1 text-center text-[9px] font-mono text-text2 truncate' }, [lbl]));
      }
      chartWrap.appendChild(xRow);
    }

    root.appendChild(chartWrap);
    root.appendChild(tooltipEl);

    // Legend
    if (isCategoricalLine && xLabels.length > 1) {
      const leg = h('div', { class: 'flex gap-3 flex-wrap mt-2' });
      xLabels.forEach((lbl, xi) => {
        const row = h('div', { class: 'flex items-center gap-1 text-xs' });
        row.appendChild(h('div', { class: 'w-2.5 h-2.5 rounded-full flex-shrink-0', style: `background:${PAL[xi % PAL.length]};` }));
        row.appendChild(h('span', { class: 'text-text2' }, [lbl]));
        leg.appendChild(row);
      });
      root.appendChild(leg);
    } else if (isCategoricalBar && xLabels.length > 1) {
      const leg = h('div', { class: 'flex gap-3 flex-wrap mt-2' });
      xLabels.forEach((lbl, xi) => {
        const row = h('div', { class: 'flex items-center gap-1 text-xs' });
        row.appendChild(h('div', { class: 'w-2.5 h-2.5 rounded-sm flex-shrink-0', style: `background:${PAL[xi % PAL.length]};` }));
        row.appendChild(h('span', { class: 'text-text2' }, [lbl]));
        leg.appendChild(row);
      });
      root.appendChild(leg);
    } else if (showLegend) {
      const leg = h('div', { class: 'flex gap-3 flex-wrap mt-2' });
      datasets.forEach((ds, i) => {
        const row = h('div', { class: 'flex items-center gap-1 text-xs' });
        row.appendChild(h('div', { class: 'w-2.5 h-2.5 rounded-sm flex-shrink-0', style: `background:${col(ds, i)};` }));
        row.appendChild(h('span', { class: 'text-text2' }, [ds.label ?? `Series ${i + 1}`]));
        leg.appendChild(row);
      });
      root.appendChild(leg);
    }
  }

  container.appendChild(root);
  (container as any).__exportPng = makeExportPng(container);

  return () => {
    for (const l of listeners) l.el.removeEventListener(l.type, l.fn);
    listeners.length = 0;
    container.innerHTML = '';
    delete (container as any).__exportPng;
  };
}
