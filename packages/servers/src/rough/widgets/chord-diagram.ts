// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels as string[]) || [];
  const matrix = (data.matrix as number[][]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 500;
  const { svg, rc } = await createRoughSVG(container, w, h);

  const cx = w / 2, cy = (title ? 270 : 250);
  const radius = 180;
  const n = labels.length;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });
  if (n === 0) return () => { svg.remove(); };

  // compute totals per group
  const groupTotals = matrix.map(row => row.reduce((s, v) => s + v, 0));
  const total = groupTotals.reduce((s, v) => s + v, 0) || 1;
  const padAngle = 0.04;
  const availAngle = Math.PI * 2 - n * padAngle;

  // compute arcs
  const arcs: { start: number; end: number }[] = [];
  let angle = 0;
  groupTotals.forEach((gt, i) => {
    const sweep = (gt / total) * availAngle;
    arcs.push({ start: angle, end: angle + sweep });
    angle += sweep + padAngle;
  });

  // draw outer arcs
  arcs.forEach((arc, i) => {
    svg.appendChild(rc.arc(cx, cy, radius * 2, radius * 2, arc.start - Math.PI / 2, arc.end - Math.PI / 2, false, {
      stroke: COLORS[i % COLORS.length], strokeWidth: 12, roughness: 1, fill: 'none',
    }));
    const midAngle = (arc.start + arc.end) / 2 - Math.PI / 2;
    const lx = cx + Math.cos(midAngle) * (radius + 20);
    const ly = cy + Math.sin(midAngle) * (radius + 20);
    addText(svg, lx, ly, labels[i], { fontSize: 10 });
  });

  // draw chords (simplified: just draw lines between arc midpoints for non-zero connections)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const val = matrix[i][j] + (matrix[j]?.[i] || 0);
      if (val === 0) continue;
      const a1 = (arcs[i].start + arcs[i].end) / 2 - Math.PI / 2;
      const a2 = (arcs[j].start + arcs[j].end) / 2 - Math.PI / 2;
      const x1 = cx + Math.cos(a1) * (radius - 10);
      const y1 = cy + Math.sin(a1) * (radius - 10);
      const x2 = cx + Math.cos(a2) * (radius - 10);
      const y2 = cy + Math.sin(a2) * (radius - 10);
      const thickness = Math.max((val / total) * 10, 1);

      const pathStr = `M ${x1} ${y1} Q ${cx} ${cy}, ${x2} ${y2}`;
      svg.appendChild(rc.path(pathStr, {
        stroke: COLORS[i % COLORS.length], strokeWidth: thickness, roughness: 0.8, fill: 'none',
      }));
    }
  }

  return () => { svg.remove(); };
}
