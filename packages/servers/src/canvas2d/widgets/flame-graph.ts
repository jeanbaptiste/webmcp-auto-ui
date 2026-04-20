// @ts-nocheck
// Flame graph — stacked horizontal bars, depth-based color
import { createCanvas } from './shared.js';

interface FlameFrame { name: string; value: number; children?: FlameFrame[] }
interface FlatRect { name: string; value: number; depth: number; x0: number; x1: number }

function flatten(root: FlameFrame): FlatRect[] {
  const rects: FlatRect[] = [];
  const total = root.value;
  function walk(node: FlameFrame, depth: number, start: number) {
    const w = node.value / total;
    rects.push({ name: node.name, value: node.value, depth, x0: start, x1: start + w });
    if (node.children) {
      let offset = start;
      for (const child of node.children) { walk(child, depth + 1, offset); offset += child.value / total; }
    }
  }
  walk(root, 0, 0);
  return rects;
}

function depthColor(d: number): string {
  return `hsl(${30 + (d * 17) % 40},${70 + (d * 5) % 25}%,${50 + (d * 3) % 15}%)`;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const root = data.root as FlameFrame;
  const title = (data.title as string) ?? '';
  if (!root) { container.textContent = '[flame-graph: no data]'; return; }

  const rects = flatten(root);
  const maxDepth = rects.reduce((m, r) => Math.max(m, r.depth), 0);
  const ROW_H = 20, GAP = 1;
  const neededH = (title ? 28 : 8) + (maxDepth + 1) * (ROW_H + GAP) + 8;

  const { cleanup } = createCanvas(container, (ctx, W, _H) => {
    const m = { top: title ? 28 : 8, left: 4, right: 4 };
    const pW = W - m.left - m.right;

    if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

    for (const r of rects) {
      const rx = m.left + r.x0 * pW;
      const rw = (r.x1 - r.x0) * pW;
      const ry = m.top + r.depth * (ROW_H + GAP);
      if (rw < 0.5) continue;
      ctx.fillStyle = depthColor(r.depth);
      ctx.fillRect(rx, ry, rw - GAP, ROW_H);
      if (rw > 30) {
        ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const label = r.name.length * 7 > rw - 4 ? r.name.slice(0, Math.floor((rw - 10) / 7)) + '..' : r.name;
        const tx = rx + 3;
        const ty = ry + ROW_H / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeText(label, tx, ty);
        ctx.restore();
        ctx.fillStyle = '#fff';
        ctx.fillText(label, tx, ty);
      }
    }
  }, 500, Math.max(400, neededH));

  return cleanup;
}
