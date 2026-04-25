// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Sigma.js + Graphology utilities — lazy loading, themed renderers
// ---------------------------------------------------------------------------

let _sigma: any = null;
let _graphology: any = null;
let _fa2: any = null;
let _circular: any = null;
let _random: any = null;
let _generators: any = null;

/** Lazy-load Sigma. */
export async function loadSigma(): Promise<any> {
  if (_sigma) return _sigma;
  const mod = await import('sigma');
  _sigma = mod.default ?? mod;
  return _sigma;
}

/** Lazy-load Graphology. */
export async function loadGraphology(): Promise<any> {
  if (_graphology) return _graphology;
  const mod = await import('graphology');
  _graphology = mod.default ?? mod;
  return _graphology;
}

/** Lazy-load forceAtlas2 layout. */
export async function loadForceAtlas2(): Promise<any> {
  if (_fa2) return _fa2;
  const mod = await import('graphology-layout-forceatlas2');
  _fa2 = mod.default ?? mod;
  return _fa2;
}

/** Lazy-load circular layout. */
export async function loadCircular(): Promise<any> {
  if (_circular) return _circular;
  const mod = await import('graphology-layout/circular');
  _circular = mod.default ?? mod;
  return _circular;
}

/** Lazy-load random layout. */
export async function loadRandom(): Promise<any> {
  if (_random) return _random;
  const mod = await import('graphology-layout/random');
  _random = mod.default ?? mod;
  return _random;
}

/** Lazy-load graphology-generators. */
export async function loadGenerators(): Promise<any> {
  if (_generators) return _generators;
  const mod = await import('graphology-generators');
  _generators = mod.default ?? mod;
  return _generators;
}

/** Default themed Sigma settings (transparent bg, mid-gray labels). */
export function sigmaSettings(extra?: any): any {
  return {
    // Tolerate a 0×0 container at first mount — the ResizeObserver in
    // mountSigma() triggers refresh() once the real size is computed.
    // See _retex_flex/06-sigma-preload-placeholders.md.
    allowInvalidContainer: true,
    defaultEdgeColor: '#bbb',
    defaultNodeColor: '#4a90e2',
    labelColor: { color: '#666' },
    labelSize: 12,
    labelWeight: '500',
    labelFont: 'system-ui, -apple-system, sans-serif',
    edgeLabelColor: { color: '#888' },
    renderEdgeLabels: false,
    ...(extra ?? {}),
  };
}

/** Prepare a sigma container with sensible sizing defaults. */
export function prepareContainer(container: HTMLElement): void {
  container.style.width = container.style.width || '100%';
  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '400px';
  container.style.position = container.style.position || 'relative';
}

/** Color palette for clusters / multi-modal nodes. */
export const PALETTE = [
  '#4a90e2',
  '#e94e77',
  '#52b788',
  '#f4a261',
  '#9d4edd',
  '#06aed5',
  '#ef476f',
  '#ffd166',
  '#118ab2',
  '#073b4c',
];

export function colorFor(i: number): string {
  return PALETTE[i % PALETTE.length];
}

/** Empty-state hint with no-op cleanup. */
export function renderEmpty(container: HTMLElement, widgetId: string, hint?: string): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? "Pass <code>{nodes: [{id, ...}], edges: [{source, target, ...}]}</code>."}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/**
 * Build a Graphology graph from `{nodes, edges}` input. Tolerant to common
 * shape variations:
 *  - nodes: [{id, label?, x?, y?, size?, color?, cluster?, type?}]
 *  - edges: [{source, target, label?, weight?, size?, color?, type?}]
 *           or [{from, to, ...}] / [{src, dst, ...}]
 *
 * Missing positions get small random values so layouts have something to
 * iterate from. Missing sizes default to 5; colors default to the palette.
 */
export async function buildGraph(
  data: any,
  opts: { directed?: boolean; multi?: boolean } = {},
): Promise<any> {
  const Graph = await loadGraphology();
  const graph = opts.multi
    ? new Graph({ type: opts.directed ? 'directed' : 'undirected', multi: true })
    : opts.directed
    ? new Graph({ type: 'directed' })
    : new Graph();

  const rawNodes: any[] = Array.isArray(data?.nodes) ? data.nodes : [];
  const rawEdges: any[] = Array.isArray(data?.edges)
    ? data.edges
    : Array.isArray(data?.links)
    ? data.links
    : [];

  // Add nodes
  for (let i = 0; i < rawNodes.length; i++) {
    const n = rawNodes[i] ?? {};
    const id = String(n.id ?? n.key ?? `n${i}`);
    if (graph.hasNode(id)) continue;
    const attrs: any = {
      label: n.label ?? id,
      x: typeof n.x === 'number' ? n.x : Math.random(),
      y: typeof n.y === 'number' ? n.y : Math.random(),
      size: typeof n.size === 'number' ? n.size : 5,
      color: n.color ?? '#4a90e2',
    };
    if (n.cluster !== undefined) attrs.cluster = n.cluster;
    if (n.type !== undefined) attrs.type = n.type;
    graph.addNode(id, attrs);
  }

  // Add edges
  for (let i = 0; i < rawEdges.length; i++) {
    const e = rawEdges[i] ?? {};
    const source = String(e.source ?? e.from ?? e.src ?? '');
    const target = String(e.target ?? e.to ?? e.dst ?? '');
    if (!source || !target) continue;
    if (!graph.hasNode(source)) graph.addNode(source, { label: source, x: Math.random(), y: Math.random(), size: 5, color: '#4a90e2' });
    if (!graph.hasNode(target)) graph.addNode(target, { label: target, x: Math.random(), y: Math.random(), size: 5, color: '#4a90e2' });
    const attrs: any = {};
    if (e.label !== undefined) attrs.label = e.label;
    if (typeof e.weight === 'number') attrs.weight = e.weight;
    if (typeof e.size === 'number') attrs.size = e.size;
    if (e.color !== undefined) attrs.color = e.color;
    if (e.type !== undefined) attrs.type = e.type;
    try {
      graph.addEdge(source, target, attrs);
    } catch {
      // duplicate edge in non-multi graph — ignore
    }
  }

  return graph;
}

/** Mount Sigma on container; return cleanup. Wires ResizeObserver for reflow. */
export async function mountSigma(
  container: HTMLElement,
  graph: any,
  settings?: any,
): Promise<() => void> {
  const Sigma = await loadSigma();
  prepareContainer(container);
  const renderer = new Sigma(graph, container, sigmaSettings(settings));

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const ro = new ResizeObserver(() => {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      try {
        renderer.refresh();
      } catch {
        // detached — ignore
      }
    }, 50);
  });
  ro.observe(container);

  return () => {
    ro.disconnect();
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    try {
      renderer.kill();
    } catch {
      // ignore
    }
    container.innerHTML = '';
  };
}
