// ---------------------------------------------------------------------------
// Heatmap widget — Canvas 2D
// Colored grid cells, axis labels, color legend. Blue→Red scale.
// ---------------------------------------------------------------------------

import { fitCanvas, autoResize, coldHot, showTooltip, hideTooltip } from '../utils.js';

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  const values = data.values as number[][];
  const xLabels = (data.xLabels ?? []) as string[];
  const yLabels = (data.yLabels ?? []) as string[];
  const title = (data.title as string) ?? '';

  const rows = values.length;
  const cols = rows > 0 ? values[0].length : 0;

  // Compute global min/max
  let vMin = Infinity, vMax = -Infinity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = values[r][c];
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
  }
  if (vMin === vMax) { vMin -= 1; vMax += 1; }
  const vRange = vMax - vMin;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  // Track mouse for tooltip
  let mouseX = -1, mouseY = -1;
  let plotX = 0, plotY = 0, plotW = 0, plotH = 0;

  function draw(w: number, h: number): void {
    ctx.clearRect(0, 0, w, h);

    const margin = { top: title ? 30 : 10, right: 60, bottom: 40, left: 60 };
    plotX = margin.left;
    plotY = margin.top;
    plotW = w - margin.left - margin.right;
    plotH = h - margin.top - margin.bottom;
    if (plotW <= 0 || plotH <= 0) return;

    const cellW = plotW / cols;
    const cellH = plotH / rows;

    // Title
    if (title) {
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(title, w / 2, 18);
    }

    // Cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = (values[r][c] - vMin) / vRange;
        ctx.fillStyle = coldHot(t);
        ctx.fillRect(plotX + c * cellW, plotY + r * cellH, cellW - 0.5, cellH - 0.5);
      }
    }

    // X labels
    ctx.save();
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let c = 0; c < cols && c < xLabels.length; c++) {
      ctx.fillText(xLabels[c], plotX + (c + 0.5) * cellW, plotY + plotH + 4, cellW - 2);
    }
    ctx.restore();

    // Y labels
    ctx.save();
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < rows && r < yLabels.length; r++) {
      ctx.fillText(yLabels[r], plotX - 4, plotY + (r + 0.5) * cellH);
    }
    ctx.restore();

    // Legend bar
    const lx = w - margin.right + 10, ly = plotY, lw = 14, lh = plotH;
    for (let i = 0; i < lh; i++) {
      const t = 1 - i / lh;
      ctx.fillStyle = coldHot(t);
      ctx.fillRect(lx, ly + i, lw, 1.5);
    }
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(formatNum(vMax), lx + lw + 3, ly);
    ctx.textBaseline = 'bottom';
    ctx.fillText(formatNum(vMin), lx + lw + 3, ly + lh);
  }

  const cleanup = autoResize(canvas, draw);

  function onMove(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    const cellW = plotW / cols;
    const cellH = plotH / rows;
    const c = Math.floor((mouseX - plotX) / cellW);
    const r = Math.floor((mouseY - plotY) / cellH);
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      const v = values[r][c];
      const xl = xLabels[c] ?? `col ${c}`;
      const yl = yLabels[r] ?? `row ${r}`;
      showTooltip(e.clientX, e.clientY, `<b>${yl}, ${xl}</b>: ${formatNum(v)}`);
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

function formatNum(v: number): string {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
