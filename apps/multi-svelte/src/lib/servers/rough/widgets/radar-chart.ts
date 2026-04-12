// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels as string[]) || [];
  const values = (data.values as number[]) || [];
  const title = data.title as string | undefined;
  const maxVal = (data.max as number) || Math.max(...values, 1);
  const w = 500, h = 450;
  const { svg, rc } = await createRoughSVG(container, w, h);

  const cx = w / 2, cy = (title ? 240 : 220);
  const radius = 160;
  const n = labels.length;
  const angleStep = (Math.PI * 2) / n;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  // grid rings
  [0.25, 0.5, 0.75, 1].forEach(frac => {
    const r = radius * frac;
    const pts = Array.from({ length: n }, (_, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    });
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      svg.appendChild(rc.line(pts[i][0], pts[i][1], next[0], next[1], {
        stroke: '#ccc', strokeWidth: 0.5, roughness: 0.5,
      }));
    }
  });

  // axis lines + labels
  labels.forEach((label, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const ex = cx + Math.cos(angle) * radius;
    const ey = cy + Math.sin(angle) * radius;
    svg.appendChild(rc.line(cx, cy, ex, ey, { stroke: '#ccc', strokeWidth: 0.5, roughness: 0.5 }));
    const lx = cx + Math.cos(angle) * (radius + 16);
    const ly = cy + Math.sin(angle) * (radius + 16);
    addText(svg, lx, ly + 4, label, { fontSize: 10 });
  });

  // data polygon
  const dataPts = values.map((v, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const r = (v / maxVal) * radius;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  });

  const pathStr = dataPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z';
  svg.appendChild(rc.path(pathStr, {
    fill: COLORS[0], fillStyle: 'cross-hatch', fillWeight: 1.5, roughness: 1.5, stroke: COLORS[0], strokeWidth: 2,
  }));

  // dots
  dataPts.forEach(([x, y]) => {
    svg.appendChild(rc.circle(x, y, 8, { fill: COLORS[0], fillStyle: 'solid', roughness: 0.8 }));
  });

  return () => { svg.remove(); };
}
