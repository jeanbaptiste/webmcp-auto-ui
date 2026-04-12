// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const events = (data.events as { date: string; label: string; description?: string }[]) || [];
  const title = data.title as string | undefined;
  const w = 560, h = Math.max(300, events.length * 60 + 80);
  const margin = { top: title ? 50 : 20, right: 20, bottom: 20, left: 100 };
  const { svg, rc } = await createRoughSVG(container, w, h);

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const lineX = margin.left + 30;
  const spacing = (h - margin.top - margin.bottom) / Math.max(events.length - 1, 1);

  // main line
  svg.appendChild(rc.line(lineX, margin.top + 20, lineX, h - margin.bottom - 10, {
    stroke: '#999', strokeWidth: 2, roughness: 1.2,
  }));

  events.forEach((ev, i) => {
    const y = margin.top + 20 + i * spacing;
    // node
    svg.appendChild(rc.circle(lineX, y, 16, {
      fill: COLORS[i % COLORS.length], fillStyle: 'solid', roughness: 1.2,
    }));
    // date on left
    addText(svg, lineX - 20, y + 4, ev.date, { fontSize: 10, anchor: 'end' });
    // label on right
    addText(svg, lineX + 20, y, ev.label, { fontSize: 11, anchor: 'start' });
    if (ev.description) {
      addText(svg, lineX + 20, y + 14, ev.description, { fontSize: 9, anchor: 'start', fill: '#666' });
    }
  });

  return () => { svg.remove(); };
}
