// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-canvas2d — Canvas 2D helpers
// Shared drawing primitives: axes, grids, color scales, tooltips.
// ---------------------------------------------------------------------------

/** Fit a <canvas> to its container's CSS size at devicePixelRatio. */
export function fitCanvas(canvas: HTMLCanvasElement): { w: number; h: number } {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

/** Create a ResizeObserver that re-fits and redraws. Returns cleanup fn. */
export function autoResize(
  canvas: HTMLCanvasElement,
  draw: (w: number, h: number) => void,
): () => void {
  const ro = new ResizeObserver(() => {
    const { w, h } = fitCanvas(canvas);
    if (w > 0 && h > 0) draw(w, h);
  });
  ro.observe(canvas.parentElement ?? canvas);
  // Initial draw
  const { w, h } = fitCanvas(canvas);
  if (w > 0 && h > 0) draw(w, h);
  return () => ro.disconnect();
}

// ---------------------------------------------------------------------------
// Color scales
// ---------------------------------------------------------------------------

/** Interpolate cold-blue → hot-red for t in [0,1]. */
export function coldHot(t: number): string {
  const tc = Math.max(0, Math.min(1, t));
  // blue (220,60%) → red (0,70%) via HSL hue rotation
  const h = 220 - tc * 220; // 220→0
  const s = 60 + tc * 10;   // 60→70
  const l = 45 + (1 - Math.abs(tc - 0.5) * 2) * 15; // brighter in the middle
  return `hsl(${h},${s}%,${l}%)`;
}

/** Category palette (10 distinct colours). */
const CATEGORY_COLORS = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
];
export function categoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

// ---------------------------------------------------------------------------
// Axis drawing
// ---------------------------------------------------------------------------

export interface AxisOptions {
  ctx: CanvasRenderingContext2D;
  x: number; y: number; length: number;
  min: number; max: number;
  horizontal: boolean;
  ticks?: number;
  label?: string;
  tickFormat?: (v: number) => string;
}

/** Draw a simple axis with tick marks and labels. */
export function drawAxis(opts: AxisOptions): void {
  const {
    ctx, x, y, length, min, max, horizontal,
    ticks: tickCount = 5, label, tickFormat = String,
  } = opts;
  ctx.save();
  ctx.strokeStyle = '#555';
  ctx.fillStyle = '#555';
  ctx.lineWidth = 1;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textBaseline = horizontal ? 'top' : 'middle';
  ctx.textAlign = horizontal ? 'center' : 'right';

  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - length);
  }
  ctx.stroke();

  const range = max - min || 1;
  const step = niceStep(range, tickCount);

  for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
    const t = (v - min) / range;
    const lbl = tickFormat(v);
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

/** Compute a "nice" tick step. */
function niceStep(range: number, targetTicks: number): number {
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

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tooltip — factory pattern (each widget instance gets its own tooltip)
// ---------------------------------------------------------------------------

export interface Tooltip {
  show(x: number, y: number, html: string): void;
  hide(): void;
  destroy(): void;
}

/** Create a tooltip instance scoped to a single widget. */
export function createTooltip(): Tooltip {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', pointerEvents: 'none', zIndex: '99999',
    background: 'rgba(30,30,30,0.92)', color: '#eee',
    fontSize: '12px', fontFamily: 'system-ui, sans-serif',
    padding: '4px 8px', borderRadius: '4px',
    whiteSpace: 'nowrap', display: 'none',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  });
  document.body.appendChild(el);

  return {
    show(x: number, y: number, html: string): void {
      el.innerHTML = html;
      el.style.display = 'block';
      el.style.left = `${x + 12}px`;
      el.style.top = `${y - 10}px`;
    },
    hide(): void {
      el.style.display = 'none';
    },
    destroy(): void {
      el.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// Backward-compat singleton (deprecated — use createTooltip() for new code)
// ---------------------------------------------------------------------------

let _singletonTooltip: Tooltip | null = null;
function ensureSingleton(): Tooltip {
  if (!_singletonTooltip) _singletonTooltip = createTooltip();
  return _singletonTooltip;
}

/** @deprecated Use createTooltip() instead — singleton is not safe with multiple widget instances. */
export function showTooltip(x: number, y: number, html: string): void {
  ensureSingleton().show(x, y, html);
}

/** @deprecated Use createTooltip() instead — singleton is not safe with multiple widget instances. */
export function hideTooltip(): void {
  ensureSingleton().hide();
}
