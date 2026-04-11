// ---------------------------------------------------------------------------
// Scatter plot widget — Canvas 2D
// 2D point cloud with optional size/category, axes with ticks. 10K+ points.
// ---------------------------------------------------------------------------

import {
  autoResize, drawAxis, drawGrid, categoryColor,
  showTooltip, hideTooltip,
} from '../utils.js';

interface Point { x: number; y: number; size?: number; category?: string; label?: string }

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  const points = data.points as Point[];
  const title = (data.title as string) ?? '';
  const xLabel = (data.xLabel as string) ?? '';
  const yLabel = (data.yLabel as string) ?? '';

  if (!points || points.length === 0) {
    container.textContent = '[scatter: no data]';
    return () => {};
  }

  // Bounds
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const p of points) {
    if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
  }
  if (xMin === xMax) { xMin -= 1; xMax += 1; }
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  // Add 5% padding
  xMin -= xRange * 0.05; xMax += xRange * 0.05;
  yMin -= yRange * 0.05; yMax += yRange * 0.05;
  const xR = xMax - xMin, yR = yMax - yMin;

  // Category map
  const catMap = new Map<string, number>();
  let catIdx = 0;
  for (const p of points) {
    if (p.category && !catMap.has(p.category)) catMap.set(p.category, catIdx++);
  }

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  const margin = { top: title ? 30 : 14, right: 14, bottom: 44, left: 52 };

  // Pre-compute screen coords (recomputed on resize)
  let screenPts: { sx: number; sy: number; r: number; color: string; idx: number }[] = [];
  let plotX = 0, plotY = 0, plotW = 0, plotH = 0;

  function draw(w: number, h: number): void {
    ctx.clearRect(0, 0, w, h);

    plotX = margin.left;
    plotY = margin.top;
    plotW = w - margin.left - margin.right;
    plotH = h - margin.top - margin.bottom;
    if (plotW <= 0 || plotH <= 0) return;

    // Title
    if (title) {
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(title, w / 2, 18);
    }

    // Grid
    drawGrid(ctx, plotX, plotY + plotH, plotW, plotH, xMin, xMax, yMin, yMax);

    // Axes
    drawAxis({ ctx, x: plotX, y: plotY + plotH, length: plotW, min: xMin, max: xMax, horizontal: true, label: xLabel });
    drawAxis({ ctx, x: plotX, y: plotY + plotH, length: plotH, min: yMin, max: yMax, horizontal: false, label: yLabel });

    // Points — batch by color to reduce state changes
    screenPts = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const sx = plotX + ((p.x - xMin) / xR) * plotW;
      const sy = plotY + plotH - ((p.y - yMin) / yR) * plotH;
      const r = p.size != null ? Math.max(1.5, Math.min(8, p.size)) : 3;
      const ci = p.category ? (catMap.get(p.category) ?? 0) : 0;
      screenPts.push({ sx, sy, r, color: categoryColor(ci), idx: i });
    }

    // Draw in batches by color
    const byColor = new Map<string, typeof screenPts>();
    for (const sp of screenPts) {
      const arr = byColor.get(sp.color);
      if (arr) arr.push(sp);
      else byColor.set(sp.color, [sp]);
    }

    for (const [color, pts] of byColor) {
      ctx.fillStyle = color + 'cc'; // slight transparency
      ctx.beginPath();
      for (const p of pts) {
        ctx.moveTo(p.sx + p.r, p.sy);
        ctx.arc(p.sx, p.sy, p.r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  const cleanup = autoResize(canvas, draw);

  // Tooltip — find nearest point
  function onMove(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let bestDist = 20; // max pixel distance
    let best: typeof screenPts[0] | null = null;
    for (const sp of screenPts) {
      const d = Math.hypot(sp.sx - mx, sp.sy - my);
      if (d < bestDist) { bestDist = d; best = sp; }
    }

    if (best) {
      const p = points[best.idx];
      let html = `<b>x:</b> ${p.x}, <b>y:</b> ${p.y}`;
      if (p.category) html += ` <b>cat:</b> ${p.category}`;
      if (p.label) html += `<br>${p.label}`;
      showTooltip(e.clientX, e.clientY, html);
    } else {
      hideTooltip();
    }
  }

  function onLeave(): void { hideTooltip(); }

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);

  return () => {
    cleanup();
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('mouseleave', onLeave);
    hideTooltip();
  };
}
