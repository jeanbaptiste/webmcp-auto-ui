// ---------------------------------------------------------------------------
// Flame graph widget — Canvas 2D
// Stacked horizontal bars, depth-based color, hover tooltip.
// ---------------------------------------------------------------------------

import { autoResize, showTooltip, hideTooltip } from '../utils.js';

export interface FlameFrame {
  name: string;
  value: number;
  children?: FlameFrame[];
}

// Flatten flame tree into drawable rectangles
interface FlatRect {
  name: string;
  value: number;
  depth: number;
  x0: number; // normalized 0..1
  x1: number;
}

function flatten(root: FlameFrame): FlatRect[] {
  const rects: FlatRect[] = [];
  const totalValue = root.value;

  function walk(node: FlameFrame, depth: number, start: number): void {
    const w = node.value / totalValue;
    rects.push({ name: node.name, value: node.value, depth, x0: start, x1: start + w });
    if (node.children) {
      let offset = start;
      for (const child of node.children) {
        walk(child, depth + 1, offset);
        offset += child.value / totalValue;
      }
    }
  }

  walk(root, 0, 0);
  return rects;
}

// Warm palette by depth
function depthColor(depth: number): string {
  const hue = 30 + (depth * 17) % 40; // orange-red range
  const sat = 70 + (depth * 5) % 25;
  const light = 50 + (depth * 3) % 15;
  return `hsl(${hue},${sat}%,${light}%)`;
}

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  const root = data.root as FlameFrame;
  const title = (data.title as string) ?? '';

  if (!root) {
    container.textContent = '[flame-graph: no data]';
    return () => {};
  }

  const rects = flatten(root);
  const maxDepth = rects.reduce((m, r) => Math.max(m, r.depth), 0);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  const ROW_HEIGHT = 20;
  const GAP = 1;
  const margin = { top: title ? 28 : 8, left: 4, right: 4, bottom: 4 };

  // Drawn rects in screen space for hit-testing
  let screenRects: { x: number; y: number; w: number; h: number; idx: number }[] = [];

  function draw(w: number, h: number): void {
    ctx.clearRect(0, 0, w, h);
    screenRects = [];

    const pX = margin.left;
    const pW = w - margin.left - margin.right;
    const topY = margin.top;
    if (pW <= 0) return;

    // Title
    if (title) {
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(title, w / 2, 18);
    }

    // Flame graphs are typically bottom-up (root at bottom)
    // But icicle (top-down) is more common in web UIs
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const rx = pX + r.x0 * pW;
      const rw = (r.x1 - r.x0) * pW;
      const ry = topY + r.depth * (ROW_HEIGHT + GAP);

      if (rw < 0.5) continue; // skip sub-pixel

      ctx.fillStyle = depthColor(r.depth);
      ctx.fillRect(rx, ry, rw - GAP, ROW_HEIGHT);

      screenRects.push({ x: rx, y: ry, w: rw - GAP, h: ROW_HEIGHT, idx: i });

      // Label if enough room
      if (rw > 30) {
        ctx.fillStyle = '#fff';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const label = r.name.length * 7 > rw - 4
          ? r.name.slice(0, Math.floor((rw - 10) / 7)) + '..'
          : r.name;
        ctx.fillText(label, rx + 3, ry + ROW_HEIGHT / 2);
      }
    }
  }

  // Set min height based on depth
  const neededH = margin.top + (maxDepth + 1) * (ROW_HEIGHT + GAP) + margin.bottom;
  canvas.style.minHeight = `${neededH}px`;

  const cleanupResize = autoResize(canvas, draw);

  function onMove(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const sr of screenRects) {
      if (mx >= sr.x && mx <= sr.x + sr.w && my >= sr.y && my <= sr.y + sr.h) {
        const r = rects[sr.idx];
        const pct = ((r.x1 - r.x0) * 100).toFixed(1);
        showTooltip(e.clientX, e.clientY,
          `<b>${r.name}</b><br>value: ${r.value} (${pct}%)<br>depth: ${r.depth}`);
        return;
      }
    }
    hideTooltip();
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
