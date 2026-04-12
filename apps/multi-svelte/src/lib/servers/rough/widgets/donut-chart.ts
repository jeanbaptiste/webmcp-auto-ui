// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels as string[]) || [];
  const values = (data.values as number[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 420;
  const { svg, rc } = await createRoughSVG(container, w, h);

  const cx = w / 2, cy = (title ? 220 : 200);
  const outerR = 140, innerR = 70;
  const total = values.reduce((s, v) => s + v, 0) || 1;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  let startAngle = -Math.PI / 2;
  values.forEach((v, i) => {
    const sweep = (v / total) * Math.PI * 2;
    const endAngle = startAngle + sweep;

    // outer arc
    svg.appendChild(rc.arc(cx, cy, outerR * 2, outerR * 2, startAngle, endAngle, true, {
      fill: COLORS[i % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
    }));

    // label at mid radius
    const midAngle = startAngle + sweep / 2;
    const midR = (outerR + innerR) / 2;
    const lx = cx + Math.cos(midAngle) * midR;
    const ly = cy + Math.sin(midAngle) * midR;
    if (sweep > 0.3) addText(svg, lx, ly, labels[i] || '', { fontSize: 10 });

    startAngle = endAngle;
  });

  // inner circle to create donut hole
  svg.appendChild(rc.circle(cx, cy, innerR * 2, {
    fill: '#ffffff', fillStyle: 'solid', roughness: 1, stroke: '#333', strokeWidth: 1,
  }));

  // center total
  addText(svg, cx, cy + 5, String(total), { fontSize: 16 });

  return () => { svg.remove(); };
}
