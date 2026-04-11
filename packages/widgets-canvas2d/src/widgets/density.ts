// ---------------------------------------------------------------------------
// Density plot widget — Canvas 2D
// Kernel density estimation (Gaussian) with filled curve.
// ---------------------------------------------------------------------------

import {
  autoResize, drawAxis, showTooltip, hideTooltip,
} from '../utils.js';

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  const values = data.values as number[];
  const title = (data.title as string) ?? '';
  const color = (data.color as string) ?? '#4e79a7';
  const bandwidth = (data.bandwidth as number) ?? 0; // 0 = auto

  if (!values || values.length === 0) {
    container.textContent = '[density: no data]';
    return () => {};
  }

  // Sort for quick stats
  const sorted = Float64Array.from(values).sort();
  const n = sorted.length;
  const dMin = sorted[0];
  const dMax = sorted[n - 1];

  // Silverman's rule of thumb for bandwidth
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const iqr = sorted[Math.floor(n * 0.75)] - sorted[Math.floor(n * 0.25)];
  const h = bandwidth > 0
    ? bandwidth
    : 0.9 * Math.min(stdDev, iqr / 1.34) * Math.pow(n, -0.2);

  // Extend range
  const xPad = 3 * h;
  const xMin = dMin - xPad;
  const xMax = dMax + xPad;
  const xRange = xMax - xMin;

  // Evaluate density on a grid of 200 points
  const GRID = 200;
  const density = new Float64Array(GRID);
  let denseMax = 0;
  const coeff = 1 / (n * h * Math.sqrt(2 * Math.PI));

  for (let i = 0; i < GRID; i++) {
    const x = xMin + (i / (GRID - 1)) * xRange;
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const u = (x - sorted[j]) / h;
      sum += Math.exp(-0.5 * u * u);
    }
    density[i] = coeff * sum;
    if (density[i] > denseMax) denseMax = density[i];
  }

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  const margin = { top: title ? 30 : 14, right: 14, bottom: 44, left: 52 };

  function draw(w: number, h: number): void {
    ctx.clearRect(0, 0, w, h);

    const pX = margin.left;
    const pY = margin.top;
    const pW = w - margin.left - margin.right;
    const pH = h - margin.top - margin.bottom;
    if (pW <= 0 || pH <= 0) return;

    // Title
    if (title) {
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(title, w / 2, 18);
    }

    // X axis
    drawAxis({ ctx, x: pX, y: pY + pH, length: pW, min: xMin, max: xMax, horizontal: true });
    // Y axis (density)
    drawAxis({ ctx, x: pX, y: pY + pH, length: pH, min: 0, max: denseMax, horizontal: false });

    // Filled curve
    ctx.beginPath();
    ctx.moveTo(pX, pY + pH);
    for (let i = 0; i < GRID; i++) {
      const x = pX + (i / (GRID - 1)) * pW;
      const y = pY + pH - (density[i] / denseMax) * pH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(pX + pW, pY + pH);
    ctx.closePath();
    ctx.fillStyle = color + '40';
    ctx.fill();

    // Stroke
    ctx.beginPath();
    for (let i = 0; i < GRID; i++) {
      const x = pX + (i / (GRID - 1)) * pW;
      const y = pY + pH - (density[i] / denseMax) * pH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const cleanupResize = autoResize(canvas, draw);

  function onMove(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const pX = margin.left;
    const pW = rect.width - margin.left - margin.right;
    const t = (mx - pX) / pW;
    if (t >= 0 && t <= 1) {
      const xVal = xMin + t * xRange;
      const idx = Math.round(t * (GRID - 1));
      const d = density[Math.max(0, Math.min(GRID - 1, idx))];
      showTooltip(e.clientX, e.clientY, `<b>x:</b> ${xVal.toFixed(3)}<br><b>density:</b> ${d.toFixed(5)}`);
    } else {
      hideTooltip();
    }
  }

  function onLeave(): void { hideTooltip(); }

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);

  return () => {
    cleanupResize();
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('mouseleave', onLeave);
    hideTooltip();
  };
}
