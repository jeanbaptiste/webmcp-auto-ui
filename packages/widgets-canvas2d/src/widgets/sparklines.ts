// ---------------------------------------------------------------------------
// Sparklines widget — Canvas 2D
// Minimal inline line chart, no axes, just the curve. Adaptive to container.
// ---------------------------------------------------------------------------

import { fitCanvas, autoResize, showTooltip, hideTooltip } from '../utils.js';

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  const values = data.values as number[];
  const color = (data.color as string) ?? '#4e79a7';
  const filled = (data.filled as boolean) ?? true;

  if (!values || values.length === 0) {
    container.textContent = '[sparkline: no data]';
    return () => {};
  }

  let vMin = Infinity, vMax = -Infinity;
  for (const v of values) {
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }
  if (vMin === vMax) { vMin -= 1; vMax += 1; }
  const vRange = vMax - vMin;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  function draw(w: number, h: number): void {
    ctx.clearRect(0, 0, w, h);

    const pad = 2;
    const pw = w - pad * 2;
    const ph = h - pad * 2;
    const n = values.length;
    if (n < 2 || pw <= 0 || ph <= 0) return;

    const stepX = pw / (n - 1);

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = pad + i * stepX;
      const y = pad + ph - ((values[i] - vMin) / vRange) * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    if (filled) {
      ctx.lineTo(pad + (n - 1) * stepX, pad + ph);
      ctx.lineTo(pad, pad + ph);
      ctx.closePath();
      ctx.fillStyle = color + '30'; // 30 = ~19% opacity
      ctx.fill();
    }

    // Stroke the line
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = pad + i * stepX;
      const y = pad + ph - ((values[i] - vMin) / vRange) * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // End dot
    const lastX = pad + (n - 1) * stepX;
    const lastY = pad + ph - ((values[n - 1] - vMin) / vRange) * ph;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  const cleanup = autoResize(canvas, draw);

  function onMove(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const pad = 2;
    const pw = rect.width - pad * 2;
    const n = values.length;
    const idx = Math.round(((mx - pad) / pw) * (n - 1));
    if (idx >= 0 && idx < n) {
      showTooltip(e.clientX, e.clientY, `<b>#${idx}</b>: ${values[idx]}`);
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
