// Vanilla renderer for the D3 widget.
// Mirrors packages/ui/src/widgets/rich/D3Widget.svelte (4 presets).
//
// Contract: export function render(container, spec): () => void
// - `spec` is the D3Spec (same shape as the Svelte version).
// - D3 is lazy-loaded.
// - Force preset simulation is stopped on cleanup.
// - container.__exportPng(scale) serialises the SVG and rasterises it.

export interface D3Spec {
  title?: string;
  preset?: 'hex-heatmap' | 'radial' | 'treemap' | 'force';
  data: unknown;
  config?: Record<string, unknown>;
}

type D3Module = typeof import('d3');

// ── Colour helpers ───────────────────────────────────────────────────────────
function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// ── Chrome (outer card) ──────────────────────────────────────────────────────
function buildChrome(container: HTMLElement, title?: string): HTMLDivElement {
  container.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans';
  if (title) {
    const h = document.createElement('h3');
    h.className = 'text-sm font-semibold text-text1 mb-3';
    h.textContent = title;
    card.appendChild(h);
  }
  const slot = document.createElement('div');
  slot.className = 'w-full min-h-[200px]';
  card.appendChild(slot);
  container.appendChild(card);
  return slot;
}

function showLoading(slot: HTMLElement) {
  slot.innerHTML = '<div class="flex items-center justify-center h-48 text-text2 text-sm">Chargement D3...</div>';
}

function showError(slot: HTMLElement, msg: string) {
  slot.innerHTML = '';
  const d = document.createElement('div');
  d.className = 'text-accent2 text-sm';
  d.textContent = msg;
  slot.appendChild(d);
}

function placeholder(slot: HTMLElement, msg: string) {
  slot.innerHTML = `<p class="text-xs text-text2 p-2">${msg}</p>`;
}

// ── Presets ──────────────────────────────────────────────────────────────────

function renderHexHeatmap(d3: D3Module, el: HTMLElement, d: D3Spec) {
  const values = (d.data as { values?: number[][] })?.values;
  if (!values || values.length === 0) {
    placeholder(el, 'No data (values missing)');
    return;
  }
  const cfg = d.config ?? {};
  const cellSize: number = (cfg.cellSize as number) ?? 14;
  const colorScale: string[] = (cfg.colorScale as string[]) ?? [
    cssVar('--color-surface2', '#f0f0f6'),
    cssVar('--color-accent', '#6c5ce7'),
  ];

  const rows = values.length;
  const cols = Math.max(...values.map((r) => r.length));
  const gap = 2;
  const hex = cellSize;
  const hx = hex * Math.sqrt(3);
  const hy = hex * 1.5;
  const svgW = cols * hx + hex * 0.5 + gap * cols;
  const svgH = rows * hy + hex * 0.5 + gap * rows;

  const allVals = values.flat();
  const minVal = d3.min(allVals) ?? 0;
  const maxVal = d3.max(allVals) ?? 1;

  const colorInterp = d3.scaleLinear<string>()
    .domain([minVal, maxVal])
    .range(colorScale as [string, string]);

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${svgW} ${svgH}`)
    .attr('width', '100%')
    .attr('height', svgH);

  function hexPath(cx: number, cy: number, r: number): string {
    const pts = d3.range(6).map((i) => {
      const angle = (Math.PI / 180) * (60 * i - 30);
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });
    return `M${pts.map((p) => p.join(',')).join('L')}Z`;
  }

  values.forEach((row, ri) => {
    row.forEach((val, ci) => {
      const cx = ci * (hx + gap) + (ri % 2 === 1 ? hx / 2 : 0) + hx / 2;
      const cy = ri * (hy + gap) + hex;
      svg
        .append('path')
        .attr('d', hexPath(cx, cy, hex * 0.9))
        .attr('fill', colorInterp(val))
        .attr('stroke', 'none')
        .append('title')
        .text(String(val));
    });
  });
}

function renderRadial(d3: D3Module, el: HTMLElement, d: D3Spec, width: number) {
  const segments = (d.data as { segments?: { label: string; value: number; color?: string }[] })?.segments;
  if (!segments || segments.length === 0) {
    placeholder(el, 'No data (segments missing)');
    return;
  }
  const cfg = d.config ?? {};
  const innerRatio: number = (cfg.innerRadius as number) ?? 0.4;
  const size = Math.min(width || 300, 300);
  const outerR = size / 2 - 10;
  const innerR = outerR * innerRatio;

  const defaultColors = [
    cssVar('--color-accent', '#6c5ce7'),
    cssVar('--color-accent2', '#e17055'),
    '#00b894', '#fdcb6e', '#0984e3', '#e84393',
  ];

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${size} ${size}`)
    .attr('width', '100%')
    .attr('height', size);

  const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`);

  const pie = d3.pie<{ label: string; value: number; color?: string }>()
    .value((seg) => seg.value)
    .sort(null);

  const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; color?: string }>>()
    .innerRadius(innerR)
    .outerRadius(outerR);

  const arcs = pie(segments);

  g.selectAll('path')
    .data(arcs)
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', (_, i) => arcs[i].data.color ?? defaultColors[i % defaultColors.length])
    .attr('stroke', 'var(--color-surface, #fff)')
    .attr('stroke-width', 2)
    .append('title')
    .text((arcDatum) => `${arcDatum.data.label}: ${arcDatum.data.value}`);

  const labelArc = d3.arc<d3.PieArcDatum<{ label: string; value: number; color?: string }>>()
    .innerRadius(outerR * 0.7)
    .outerRadius(outerR * 0.7);

  g.selectAll('text')
    .data(arcs)
    .enter()
    .append('text')
    .attr('transform', (arcDatum) => `translate(${labelArc.centroid(arcDatum)})`)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('fill', 'var(--color-text1, #111)')
    .text((arcDatum) => arcDatum.data.label.length > 8 ? arcDatum.data.label.slice(0, 7) + '…' : arcDatum.data.label);
}

function renderTreemap(d3: D3Module, el: HTMLElement, d: D3Spec, width: number) {
  type TreeNode = { name: string; value?: number; children?: TreeNode[] };
  const rawData = d.data as { children?: TreeNode[] };
  if (!rawData?.children || rawData.children.length === 0) {
    placeholder(el, 'No data (children missing)');
    return;
  }
  const cfg = d.config ?? {};
  const padding: number = (cfg.padding as number) ?? 2;
  const w = width || 400;
  const h = Math.max(200, Math.round(w * 0.6));

  const accent = cssVar('--color-accent', '#6c5ce7');
  const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 10]);

  const root = d3
    .hierarchy<TreeNode>({ name: 'root', children: rawData.children })
    .sum((node) => node.value ?? 1)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  d3.treemap<TreeNode>()
    .size([w, h])
    .padding(padding)(root);

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`)
    .attr('width', '100%')
    .attr('height', h);

  const leaves = root.leaves() as (d3.HierarchyRectangularNode<TreeNode>)[];

  const cell = svg
    .selectAll('g')
    .data(leaves)
    .enter()
    .append('g')
    .attr('transform', (node) => `translate(${node.x0},${node.y0})`);

  cell
    .append('rect')
    .attr('width', (node) => Math.max(0, node.x1 - node.x0))
    .attr('height', (node) => Math.max(0, node.y1 - node.y0))
    .attr('fill', (_, i) => colorScale(i % 11))
    .attr('stroke', accent)
    .attr('stroke-width', 1)
    .append('title')
    .text((node) => `${node.data.name}: ${node.value}`);

  cell
    .append('text')
    .attr('x', 4)
    .attr('y', 14)
    .attr('font-size', '11px')
    .attr('fill', '#fff')
    .text((node) => {
      const w2 = node.x1 - node.x0;
      const label = node.data.name;
      return w2 > 30 ? (label.length > 12 ? label.slice(0, 11) + '…' : label) : '';
    });
}

// Returns the simulation so the caller can stop it on cleanup.
function renderForce(
  d3: D3Module,
  el: HTMLElement,
  d: D3Spec,
  width: number,
): { simulation?: ReturnType<D3Module['forceSimulation']> } {
  type FNode = { id: string; label?: string; group?: number };
  type FLink = { source: string; target: string; value?: number };
  const rawData = d.data as { nodes?: FNode[]; links?: FLink[] };
  if (!rawData?.nodes || rawData.nodes.length === 0) {
    placeholder(el, 'No data (nodes missing)');
    return {};
  }
  const nodes: FNode[] = rawData.nodes.map((n) => ({ ...n }));
  const links: FLink[] = (rawData.links ?? []).map((l) => ({ ...l }));
  const w = width || 400;
  const h = Math.max(250, Math.round(w * 0.65));

  const maxChars = Math.max(10, Math.floor(w / 120));
  const truncate = (text: string): string =>
    text.length > maxChars ? text.slice(0, Math.max(1, maxChars - 1)) + '…' : text;

  const accent = cssVar('--color-accent', '#6c5ce7');
  const accent2 = cssVar('--color-accent2', '#e17055');
  const groups = Array.from(new Set(nodes.map((n) => n.group ?? 0)));
  const colorMap = d3.scaleOrdinal<number, string>()
    .domain(groups)
    .range([accent, accent2, '#00b894', '#fdcb6e', '#0984e3', '#e84393']);

  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`)
    .attr('width', '100%')
    .attr('height', h);

  const sim = d3
    .forceSimulation(nodes as d3.SimulationNodeDatum[])
    .force('link', d3.forceLink(links).id((n: d3.SimulationNodeDatum) => (n as FNode).id).distance(60))
    .force('charge', d3.forceManyBody().strength(-120))
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('collision', d3.forceCollide(18));

  const link = svg
    .append('g')
    .attr('stroke', 'var(--color-border, #ccc)')
    .attr('stroke-opacity', 0.6)
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke-width', (l) => Math.sqrt(l.value ?? 1));

  const node = svg
    .append('g')
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .call(
      d3.drag<SVGGElement, FNode>()
        .on('start', (event, n) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          (n as d3.SimulationNodeDatum).fx = (n as d3.SimulationNodeDatum).x;
          (n as d3.SimulationNodeDatum).fy = (n as d3.SimulationNodeDatum).y;
        })
        .on('drag', (event, n) => {
          (n as d3.SimulationNodeDatum).fx = event.x;
          (n as d3.SimulationNodeDatum).fy = event.y;
        })
        .on('end', (event, n) => {
          if (!event.active) sim.alphaTarget(0);
          (n as d3.SimulationNodeDatum).fx = null;
          (n as d3.SimulationNodeDatum).fy = null;
        })
    );

  node
    .append('circle')
    .attr('r', 10)
    .attr('fill', (n) => colorMap(n.group ?? 0))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5);

  node
    .append('text')
    .attr('x', 14)
    .attr('y', 4)
    .attr('font-size', '10px')
    .attr('fill', 'var(--color-text1, #111)')
    .text((n) => truncate(String(n.label ?? n.id)));

  node.append('title').text((n) => String(n.label ?? n.id));

  sim.on('tick', () => {
    link
      .attr('x1', (l) => (l.source as d3.SimulationNodeDatum).x ?? 0)
      .attr('y1', (l) => (l.source as d3.SimulationNodeDatum).y ?? 0)
      .attr('x2', (l) => (l.target as d3.SimulationNodeDatum).x ?? 0)
      .attr('y2', (l) => (l.target as d3.SimulationNodeDatum).y ?? 0);
    node.attr('transform', (n) => `translate(${(n as d3.SimulationNodeDatum).x ?? 0},${(n as d3.SimulationNodeDatum).y ?? 0})`);
  });

  return { simulation: sim };
}

// ── __exportPng: SVG → canvas → blob ─────────────────────────────────────────
async function exportPng(container: HTMLElement, scale = 2): Promise<Blob> {
  const svgEl = container.querySelector('svg') as SVGSVGElement | null;
  if (!svgEl) throw new Error('No SVG to export');

  // Serialise
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);

  // Dimensions from viewBox (preferred) or bounding rect
  let w = 0;
  let h = 0;
  const vb = svgEl.getAttribute('viewBox');
  if (vb) {
    const parts = vb.split(/\s+/).map(Number);
    if (parts.length === 4) { w = parts[2]; h = parts[3]; }
  }
  if (!w || !h) {
    const rect = svgEl.getBoundingClientRect();
    w = rect.width; h = rect.height;
  }
  if (!w || !h) throw new Error('Cannot determine SVG dimensions');

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG image load failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── Main render dispatcher ───────────────────────────────────────────────────
export function render(container: HTMLElement, data: D3Spec): () => void {
  const spec = data;
  const slot = buildChrome(container, spec?.title);
  showLoading(slot);

  let cancelled = false;
  let simulation: ReturnType<D3Module['forceSimulation']> | undefined;
  let ro: ResizeObserver | undefined;
  let currentWidth = 0;
  let lastRenderedWidth = -1;

  const paint = (d3: D3Module) => {
    if (cancelled) return;
    // Stop any previous simulation before repainting.
    simulation?.stop();
    simulation = undefined;
    slot.innerHTML = '';

    if (!spec?.preset) {
      placeholder(slot, 'No preset specified.');
      return;
    }
    switch (spec.preset) {
      case 'hex-heatmap':
        renderHexHeatmap(d3, slot, spec);
        break;
      case 'radial':
        renderRadial(d3, slot, spec, currentWidth);
        break;
      case 'treemap':
        renderTreemap(d3, slot, spec, currentWidth);
        break;
      case 'force': {
        const { simulation: sim } = renderForce(d3, slot, spec, currentWidth);
        simulation = sim;
        break;
      }
      default:
        placeholder(slot, `Preset inconnu : ${spec.preset}`);
    }

    // Emit a bubbling CustomEvent so hosts can react to re-renders.
    try {
      container.dispatchEvent(new CustomEvent('d3:rendered', {
        bubbles: true,
        detail: { preset: spec.preset },
      }));
    } catch { /* noop */ }
  };

  (async () => {
    let d3: D3Module;
    try {
      d3 = await import('d3');
    } catch (e) {
      if (cancelled) return;
      showError(slot, e instanceof Error ? e.message : 'D3 load failed');
      return;
    }
    if (cancelled) return;

    // ResizeObserver: repaint on meaningful width changes (radial/treemap/force depend on it).
    ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      currentWidth = r.width;
      if (lastRenderedWidth < 0 || Math.abs(currentWidth - lastRenderedWidth) > 4) {
        lastRenderedWidth = currentWidth;
        paint(d3);
      }
    });
    ro.observe(slot);

    // Initial paint (ResizeObserver also fires synchronously after observe, but
    // kick it in case the element has zero size at mount time).
    currentWidth = slot.getBoundingClientRect().width;
    lastRenderedWidth = currentWidth;
    paint(d3);
  })();

  // Attach PNG export.
  (container as HTMLElement & { __exportPng?: (scale?: number) => Promise<Blob> }).__exportPng =
    (scale?: number) => exportPng(slot, scale ?? 2);

  return () => {
    cancelled = true;
    ro?.disconnect();
    simulation?.stop();
    simulation = undefined;
    container.innerHTML = '';
    try {
      delete (container as HTMLElement & { __exportPng?: unknown }).__exportPng;
    } catch { /* noop */ }
  };
}
