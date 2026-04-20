// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data.nodes as string[]) || [];
  const links = (data.links as { source: number; target: number; value: number }[]) || [];
  const title = data.title as string | undefined;
  const CHAR_PX = 6; // 10px sans-serif
  const maxNodeChars = Math.max(0, ...nodes.map((n) => (n ?? '').length));
  const sidePad = Math.min(220, 20 + maxNodeChars * CHAR_PX);
  const w = Math.max(560, 2 * sidePad + 200), h = 400;
  const margin = { top: title ? 50 : 20, right: sidePad, bottom: 20, left: sidePad };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  // compute simple 2-column layout
  const sourceIds = new Set(links.map(l => l.source));
  const targetIds = new Set(links.map(l => l.target));
  const leftIds = [...sourceIds].filter(id => !targetIds.has(id));
  const rightIds = [...targetIds].filter(id => !sourceIds.has(id));
  const midIds = nodes.map((_, i) => i).filter(i => !leftIds.includes(i) && !rightIds.includes(i));

  // assign columns
  const cols: number[][] = [leftIds, midIds.length > 0 ? midIds : [], rightIds].filter(c => c.length > 0);
  const colCount = cols.length;
  const nodeW = 20;
  const colSpacing = (chartW - nodeW) / Math.max(colCount - 1, 1);

  // compute node heights based on total flow
  const nodeFlow: Record<number, number> = {};
  links.forEach(l => {
    nodeFlow[l.source] = (nodeFlow[l.source] || 0) + l.value;
    nodeFlow[l.target] = (nodeFlow[l.target] || 0) + l.value;
  });
  const maxFlow = Math.max(...Object.values(nodeFlow), 1);

  // position nodes
  type NPos = { x: number; y: number; h: number };
  const nodePos: NPos[] = nodes.map(() => ({ x: 0, y: 0, h: 0 }));

  cols.forEach((col, ci) => {
    const colTotal = col.reduce((s, id) => s + (nodeFlow[id] || 1), 0);
    let y = margin.top;
    col.forEach(id => {
      const nh = Math.max(((nodeFlow[id] || 1) / colTotal) * chartH * 0.8, 10);
      nodePos[id] = { x: margin.left + ci * colSpacing, y, h: nh };
      y += nh + 8;
    });
  });

  // draw links as curved paths
  const sourceOffsets: Record<number, number> = {};
  const targetOffsets: Record<number, number> = {};

  links.forEach(l => {
    const s = nodePos[l.source];
    const t = nodePos[l.target];
    if (!s || !t) return;
    const sOff = sourceOffsets[l.source] || 0;
    const tOff = targetOffsets[l.target] || 0;
    const thickness = Math.max((l.value / maxFlow) * 40, 3);

    const x0 = s.x + nodeW;
    const y0 = s.y + sOff + thickness / 2;
    const x1 = t.x;
    const y1 = t.y + tOff + thickness / 2;
    const mx = (x0 + x1) / 2;

    const pathStr = `M ${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
    svg.appendChild(rc.path(pathStr, {
      stroke: COLORS[l.source % COLORS.length], strokeWidth: thickness, roughness: 0.8, fill: 'none',
    }));

    sourceOffsets[l.source] = sOff + thickness + 2;
    targetOffsets[l.target] = tOff + thickness + 2;
  });

  // draw node rectangles
  nodes.forEach((name, i) => {
    const p = nodePos[i];
    if (p.h === 0) return;
    svg.appendChild(rc.rectangle(p.x, p.y, nodeW, p.h, {
      fill: COLORS[i % COLORS.length], fillStyle: 'solid', roughness: 1.2, stroke: '#333',
    }));
    const labelX = cols[0]?.includes(i) ? p.x - 4 : p.x + nodeW + 4;
    const anchor = cols[0]?.includes(i) ? 'end' : 'start';
    addText(svg, labelX, p.y + p.h / 2 + 4, name, { fontSize: 10, anchor });
  });

  return () => { svg.remove(); };
}
