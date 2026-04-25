// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared AntV G6 utilities — lazy loading, theme defaults, empty-data hint
// ---------------------------------------------------------------------------

let _g6: any = null;

/** Lazy-load @antv/g6 (single import, cached). */
export async function loadG6(): Promise<any> {
  if (_g6) return _g6;
  const mod = await import('@antv/g6');
  _g6 = mod;
  return _g6;
}

/**
 * Theme-adaptive defaults. G6 doesn't support CSS variables in styles,
 * so we use mid-gray text/strokes that read on light and dark chromes.
 */
export function defaultNodeStyle(): any {
  return {
    fill: '#3388ff',
    stroke: '#fff',
    lineWidth: 1.5,
    labelFill: '#666',
    labelFontSize: 11,
    labelPlacement: 'bottom',
  };
}

export function defaultEdgeStyle(): any {
  return {
    stroke: '#999',
    lineWidth: 1,
    endArrow: true,
    endArrowSize: 6,
  };
}

/**
 * Render an "empty" hint when nodes/edges are missing, returning a no-op cleanup.
 */
export function renderEmpty(container: HTMLElement, widgetId: string, hint?: string): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? "Pass <code>{nodes: [{id, label?}, ...], edges: [{source, target, label?}, ...]}</code>."}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/**
 * Normalize incoming graph data into G6 v5 shape:
 *   { nodes: [{id, data?, style?}], edges: [{source, target, data?, style?}] }
 *
 * Accepts:
 *  - {nodes, edges}        — pass-through, ensures `id` strings
 *  - {nodes, links}        — d3 alias (links → edges)
 *  - {data: {nodes, edges}}
 */
export function normalizeGraph(data: any): { nodes: any[]; edges: any[] } {
  if (!data) return { nodes: [], edges: [] };
  const root = data?.data?.nodes ? data.data : data;
  const rawNodes = Array.isArray(root?.nodes) ? root.nodes : [];
  const rawEdges = Array.isArray(root?.edges)
    ? root.edges
    : Array.isArray(root?.links)
      ? root.links
      : [];

  const nodes = rawNodes.map((n: any, i: number) => {
    if (n && typeof n === 'object') {
      const id = n.id != null ? String(n.id) : `n${i}`;
      return {
        id,
        data: { ...(n.data ?? {}), label: n.label ?? n.data?.label ?? id },
        style: n.style,
        ...(n.x != null ? { x: n.x } : {}),
        ...(n.y != null ? { y: n.y } : {}),
        ...(n.children ? { children: n.children } : {}),
      };
    }
    return { id: String(n), data: { label: String(n) } };
  });

  const edges = rawEdges.map((e: any, i: number) => ({
    id: e.id != null ? String(e.id) : `e${i}`,
    source: String(e.source),
    target: String(e.target),
    data: { ...(e.data ?? {}), label: e.label ?? e.data?.label },
    style: e.style,
  }));

  return { nodes, edges };
}

/**
 * Detect a tree-like input — single root with `children` array. Flattens it
 * to {nodes, edges} so it can feed any layout. Used by mind-map / indented-tree.
 */
export function flattenTree(root: any): { nodes: any[]; edges: any[] } {
  if (!root || typeof root !== 'object') return { nodes: [], edges: [] };
  const nodes: any[] = [];
  const edges: any[] = [];
  let counter = 0;
  function visit(node: any, parentId: string | null) {
    const id = node.id != null ? String(node.id) : `t${counter++}`;
    nodes.push({ id, data: { label: node.label ?? node.name ?? id } });
    if (parentId) edges.push({ id: `e_${parentId}_${id}`, source: parentId, target: id });
    const children = Array.isArray(node.children) ? node.children : [];
    for (const c of children) visit(c, id);
  }
  visit(root, null);
  return { nodes, edges };
}

/**
 * Common bootstrap: ensure container sizing, instantiate Graph, render, return
 * cleanup that calls graph.destroy().
 */
export async function makeGraph(
  container: HTMLElement,
  config: any,
  widgetId: string,
): Promise<() => void> {
  const { Graph } = await loadG6();

  container.style.width = container.style.width || '100%';
  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '420px';

  const graph = new Graph({
    container,
    autoResize: true,
    node: { style: defaultNodeStyle(), ...(config.node ?? {}) },
    edge: { style: defaultEdgeStyle(), ...(config.edge ?? {}) },
    behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
    ...config,
  });

  try {
    await graph.render();
  } catch (err) {
    // Some layouts (force-atlas2 etc.) may throw if backend unavailable —
    // surface a hint rather than silently failing.
    console.error(`[${widgetId}] render failed:`, err);
    return renderEmpty(container, widgetId, `Layout failed: ${(err as any)?.message ?? err}`);
  }

  return () => {
    try {
      graph.destroy();
    } catch {
      // already destroyed — ignore
    }
  };
}
