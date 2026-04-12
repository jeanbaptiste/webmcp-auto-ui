// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const sets = (data.sets as { label: string; size: number }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 400;
  const { svg, rc } = await createRoughSVG(container, w, h);

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const cx = w / 2, cy = (title ? 230 : 210);
  const n = sets.length;

  if (n === 0) return () => { svg.remove(); };

  const maxSize = Math.max(...sets.map(s => s.size), 1);
  const baseRadius = 100;
  const overlapDist = baseRadius * 0.7;

  sets.forEach((set, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const dist = n === 1 ? 0 : overlapDist;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    const r = baseRadius * Math.sqrt(set.size / maxSize);

    svg.appendChild(rc.circle(sx, sy, r * 2, {
      fill: COLORS[i % COLORS.length], fillStyle: 'cross-hatch', fillWeight: 1, roughness: 1.5,
      stroke: COLORS[i % COLORS.length], strokeWidth: 2,
    }));
    // label outside
    const lx = cx + Math.cos(angle) * (dist + r + 16);
    const ly = cy + Math.sin(angle) * (dist + r + 16);
    addText(svg, lx, ly, `${set.label} (${set.size})`, { fontSize: 11 });
  });

  return () => { svg.remove(); };
}
