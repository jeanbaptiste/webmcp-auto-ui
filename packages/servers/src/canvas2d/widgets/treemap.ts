// @ts-nocheck
// Treemap — nested rectangles using squarified algorithm
import { createCanvas, COLORS } from './shared.js';

interface TreeNode { name: string; value?: number; children?: TreeNode[] }

function getLeafValue(node: TreeNode): number {
  if (node.value != null) return node.value;
  if (node.children) return node.children.reduce((s, c) => s + getLeafValue(c), 0);
  return 0;
}

function squarify(items: { name: string; value: number }[], x: number, y: number, w: number, h: number): { name: string; value: number; x: number; y: number; w: number; h: number }[] {
  const rects: { name: string; value: number; x: number; y: number; w: number; h: number }[] = [];
  const total = items.reduce((s, d) => s + d.value, 0);
  if (total === 0 || !items.length) return rects;

  let cx = x, cy = y, cw = w, ch = h;
  let remaining = [...items].sort((a, b) => b.value - a.value);

  while (remaining.length) {
    const horizontal = cw >= ch;
    let row: typeof items = [];
    let rowSum = 0;
    let bestRatio = Infinity;

    for (const item of remaining) {
      const testSum = rowSum + item.value;
      const testRow = [...row, item];
      const rowFrac = testSum / total * (horizontal ? cw : ch);
      let worstRatio = 0;
      for (const r of testRow) {
        const frac = r.value / testSum;
        const rw = horizontal ? rowFrac : frac * cw;
        const rh = horizontal ? frac * ch : rowFrac;
        const ratio = Math.max(rw / rh, rh / rw);
        worstRatio = Math.max(worstRatio, ratio);
      }
      if (worstRatio <= bestRatio || row.length === 0) {
        row = testRow; rowSum = testSum; bestRatio = worstRatio;
      } else break;
    }

    const rowFrac = rowSum / total;
    let offset = 0;
    for (const item of row) {
      const frac = item.value / rowSum;
      if (horizontal) {
        const rw = rowFrac * cw;
        const rh = frac * ch;
        rects.push({ name: item.name, value: item.value, x: cx, y: cy + offset, w: rw, h: rh });
        offset += rh;
      } else {
        const rw = frac * cw;
        const rh = rowFrac * ch;
        rects.push({ name: item.name, value: item.value, x: cx + offset, y: cy, w: rw, h: rh });
        offset += rw;
      }
    }

    if (horizontal) { cx += rowFrac * cw; cw -= rowFrac * cw; }
    else { cy += rowFrac * ch; ch -= rowFrac * ch; }
    remaining = remaining.slice(row.length);
  }
  return rects;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const root = data.root as TreeNode;
  const title = (data.title as string) ?? '';
  if (!root) { container.textContent = '[treemap: no data]'; return; }

  // Flatten children to first level
  const items = (root.children ?? []).map(c => ({ name: c.name, value: getLeafValue(c) }));
  if (!items.length) { container.textContent = '[treemap: no children]'; return; }

  const { cleanup } = createCanvas(container, (ctx, W, H) => {
    const m = { top: title ? 30 : 8, right: 8, bottom: 8, left: 8 };
    const pW = W - m.left - m.right, pH = H - m.top - m.bottom;

    if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

    const rects = squarify(items, m.left, m.top, pW, pH);
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      ctx.fillStyle = COLORS[i % COLORS.length] + 'cc';
      ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      if (r.w > 40 && r.h > 20) {
        ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const tx = r.x + r.w / 2;
        const ty = r.y + r.h / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(r.name, tx, ty);
        ctx.restore();
        ctx.fillStyle = '#fff';
        ctx.fillText(r.name, tx, ty);
      }
    }
  });

  return cleanup;
}
