// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const value = (data.value as number) || 0;
  const max = (data.max as number) || 100;
  const label = (data.label as string) || '';
  const title = data.title as string | undefined;
  const w = 300, h = 250;
  const { svg, rc } = await createRoughSVG(container, w, h);

  const cx = w / 2, cy = 180;
  const radius = 110;
  const pct = Math.min(value / max, 1);

  if (title) addText(svg, w / 2, 24, title, { fontSize: 14 });

  // background arc (full semicircle)
  svg.appendChild(rc.arc(cx, cy, radius * 2, radius * 2, Math.PI, Math.PI * 2, false, {
    stroke: '#ddd', strokeWidth: 8, roughness: 1, fill: 'none',
  }));

  // value arc
  const endAngle = Math.PI + pct * Math.PI;
  svg.appendChild(rc.arc(cx, cy, radius * 2, radius * 2, Math.PI, endAngle, false, {
    stroke: COLORS[0], strokeWidth: 8, roughness: 1.2, fill: 'none',
  }));

  // needle
  const needleAngle = Math.PI + pct * Math.PI;
  const nx = cx + Math.cos(needleAngle) * (radius - 20);
  const ny = cy + Math.sin(needleAngle) * (radius - 20);
  svg.appendChild(rc.line(cx, cy, nx, ny, {
    stroke: '#333', strokeWidth: 2, roughness: 1.5,
  }));

  // center dot
  svg.appendChild(rc.circle(cx, cy, 12, { fill: '#333', fillStyle: 'solid', roughness: 1 }));

  // value text
  addText(svg, cx, cy + 30, `${value} / ${max}`, { fontSize: 16 });
  if (label) addText(svg, cx, cy + 48, label, { fontSize: 12, fill: '#666' });

  // min/max labels
  addText(svg, cx - radius + 10, cy + 16, '0', { fontSize: 10, fill: '#999' });
  addText(svg, cx + radius - 10, cy + 16, String(max), { fontSize: 10, fill: '#999' });

  return () => { svg.remove(); };
}
