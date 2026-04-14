// @ts-nocheck
// ---------------------------------------------------------------------------
// Canvas 2D shared helpers — no external dependencies
// ---------------------------------------------------------------------------

/** Create a DPR-aware canvas element inside a container. */
export function createCanvas(
  container: HTMLElement,
  width = 500,
  height = 400,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  container.appendChild(canvas);
  return { canvas, ctx };
}

/** 10-color palette. */
export const COLORS = [
  '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

/** Interpolate cold→hot (blue→red) for t in [0,1]. */
export function coldHot(t: number): string {
  const tc = Math.max(0, Math.min(1, t));
  const h = 220 - tc * 220;
  const s = 60 + tc * 10;
  const l = 45 + (1 - Math.abs(tc - 0.5) * 2) * 15;
  return `hsl(${h},${s}%,${l}%)`;
}

/** Compute a "nice" tick step for axis labeling. */
export function niceStep(range: number, targetTicks: number): number {
  const raw = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const residual = raw / mag;
  let nice: number;
  if (residual <= 1.5) nice = 1;
  else if (residual <= 3) nice = 2;
  else if (residual <= 7) nice = 5;
  else nice = 10;
  return nice * mag;
}

/** Draw a simple axis with ticks. */
export function drawAxis(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, length: number,
  min: number, max: number, horizontal: boolean,
  label?: string, ticks = 5,
): void {
  ctx.save();
  ctx.strokeStyle = '#555';
  ctx.fillStyle = '#555';
  ctx.lineWidth = 1;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textBaseline = horizontal ? 'top' : 'middle';
  ctx.textAlign = horizontal ? 'center' : 'right';

  ctx.beginPath();
  if (horizontal) { ctx.moveTo(x, y); ctx.lineTo(x + length, y); }
  else { ctx.moveTo(x, y); ctx.lineTo(x, y - length); }
  ctx.stroke();

  const range = max - min || 1;
  const step = niceStep(range, ticks);

  for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
    const t = (v - min) / range;
    const lbl = formatNum(v);
    if (horizontal) {
      const tx = x + t * length;
      ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + 4); ctx.stroke();
      ctx.fillText(lbl, tx, y + 6);
    } else {
      const ty = y - t * length;
      ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x - 4, ty); ctx.stroke();
      ctx.fillText(lbl, x - 6, ty);
    }
  }

  if (label) {
    ctx.font = '11px system-ui, sans-serif';
    if (horizontal) {
      ctx.textAlign = 'center';
      ctx.fillText(label, x + length / 2, y + 22);
    } else {
      ctx.save();
      ctx.translate(x - 30, y - length / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

/** Draw grid lines. */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  xMin: number, xMax: number, yMin: number, yMax: number,
  ticks = 5,
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(128,128,128,0.15)';
  ctx.lineWidth = 1;
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const xStep = niceStep(xRange, ticks);
  const yStep = niceStep(yRange, ticks);

  for (let v = Math.ceil(xMin / xStep) * xStep; v <= xMax; v += xStep) {
    const tx = x + ((v - xMin) / xRange) * w;
    ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y - h); ctx.stroke();
  }
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {
    const ty = y - ((v - yMin) / yRange) * h;
    ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke();
  }
  ctx.restore();
}

/** Format number for display. */
export function formatNum(v: number): string {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
