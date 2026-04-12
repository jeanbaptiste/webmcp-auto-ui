// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels as string[]) || [];
  const values = (data.values as number[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 420;
  const { svg, rc } = await createRoughSVG(container, w, h);

  const cx = w / 2, cy = (title ? 220 : 200);
  const radius = 140;
  const total = values.reduce((s, v) => s + v, 0) || 1;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  let startAngle = -Math.PI / 2;
  values.forEach((v, i) => {
    const sweep = (v / total) * Math.PI * 2;
    const endAngle = startAngle + sweep;

    // rough.js arc: (x, y, width, height, start, stop, closed, options)
    svg.appendChild(rc.arc(cx, cy, radius * 2, radius * 2, startAngle, endAngle, true, {
      fill: COLORS[i % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
    }));

    // label
    const midAngle = startAngle + sweep / 2;
    const lx = cx + Math.cos(midAngle) * (radius * 0.65);
    const ly = cy + Math.sin(midAngle) * (radius * 0.65);
    addText(svg, lx, ly, labels[i] || '', { fontSize: 10, fill: '#fff' });

    startAngle = endAngle;
  });

  return () => { svg.remove(); };
}
