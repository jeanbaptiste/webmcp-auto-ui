// @ts-nocheck
// Dot matrix — grid of colored dots representing counts/percentages
import { createCanvas, COLORS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const total = (data.total as number) ?? 100;
  const segments = (data.segments ?? []) as { label: string; count: number; color?: string }[];
  const title = (data.title as string) ?? '';
  const cols = (data.cols as number) ?? 10;
  if (!segments.length) { container.textContent = '[dot-matrix: no data]'; return; }

  const rows = Math.ceil(total / cols);
  const dotR = Math.min(16, Math.floor(460 / cols / 2) - 2);
  const neededH = Math.max(400, (title ? 40 : 16) + rows * (dotR * 2 + 4) + 60);
  const { canvas, ctx } = createCanvas(container, 500, neededH);
  const W = 500;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

  // Build color array
  const colors: string[] = [];
  for (let s = 0; s < segments.length; s++) {
    const c = segments[s].color ?? COLORS[s % COLORS.length];
    for (let i = 0; i < segments[s].count; i++) colors.push(c);
  }
  while (colors.length < total) colors.push('#e5e7eb');

  const startY = title ? 36 : 12;
  const startX = (W - cols * (dotR * 2 + 4)) / 2;

  for (let i = 0; i < total; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (dotR * 2 + 4) + dotR;
    const y = startY + row * (dotR * 2 + 4) + dotR;
    ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = colors[i]; ctx.fill();
  }

  // Legend
  const legendY = startY + rows * (dotR * 2 + 4) + 12;
  ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let lx = 10;
  for (let s = 0; s < segments.length; s++) {
    const c = segments[s].color ?? COLORS[s % COLORS.length];
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(lx + 5, legendY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.fillText(`${segments[s].label} (${segments[s].count})`, lx + 14, legendY);
    lx += ctx.measureText(`${segments[s].label} (${segments[s].count})`).width + 28;
  }

  return () => { canvas.remove(); };
}
