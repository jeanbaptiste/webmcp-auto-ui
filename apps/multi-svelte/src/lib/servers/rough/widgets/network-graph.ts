// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data.nodes as { id: string; label?: string; x?: number; y?: number }[]) || [];
  const edges = (data.edges as { source: string; target: string }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 450;
  const { svg, rc } = await createRoughSVG(container, w, h);

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const cx = w / 2, cy = (title ? 250 : 230);
  const radius = 160;
  const n = nodes.length;

  // position nodes in a circle if no coords
  const nodeMap: Record<string, { x: number; y: number; label: string }> = {};
  nodes.forEach((node, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    nodeMap[node.id] = {
      x: node.x ?? cx + Math.cos(angle) * radius,
      y: node.y ?? cy + Math.sin(angle) * radius,
      label: node.label || node.id,
    };
  });

  // draw edges
  edges.forEach(e => {
    const s = nodeMap[e.source];
    const t = nodeMap[e.target];
    if (s && t) {
      svg.appendChild(rc.line(s.x, s.y, t.x, t.y, { stroke: '#999', strokeWidth: 1, roughness: 1.2 }));
    }
  });

  // draw nodes
  nodes.forEach((node, i) => {
    const n = nodeMap[node.id];
    svg.appendChild(rc.circle(n.x, n.y, 30, {
      fill: COLORS[i % COLORS.length], fillStyle: 'cross-hatch', fillWeight: 1.5, roughness: 1.5, bowing: 1,
    }));
    addText(svg, n.x, n.y + 24, n.label, { fontSize: 9 });
  });

  return () => { svg.remove(); };
}
