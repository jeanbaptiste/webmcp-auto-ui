// @ts-nocheck
// Network graph — force-directed layout (simple spring simulation)
import { createCanvas, COLORS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data.nodes ?? []) as { id: string; label?: string; group?: number }[];
  const edges = (data.edges ?? []) as { source: string; target: string }[];
  const title = (data.title as string) ?? '';
  if (!nodes.length) { container.textContent = '[network-graph: no data]'; return; }

  // Simple force-directed layout
  const W = 500, H = 400;
  const cx = W / 2, cy = H / 2;
  const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();
  for (const n of nodes) {
    positions.set(n.id, { x: cx + (Math.random() - 0.5) * 200, y: cy + (Math.random() - 0.5) * 200, vx: 0, vy: 0 });
  }

  // Run simulation
  const iterations = 100;
  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    // Repulsion
    for (const a of nodes) {
      const pa = positions.get(a.id)!;
      for (const b of nodes) {
        if (a.id === b.id) continue;
        const pb = positions.get(b.id)!;
        const dx = pa.x - pb.x, dy = pa.y - pb.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = 800 / (dist * dist);
        pa.vx += (dx / dist) * force * alpha;
        pa.vy += (dy / dist) * force * alpha;
      }
    }
    // Attraction (edges)
    for (const e of edges) {
      const pa = positions.get(e.source), pb = positions.get(e.target);
      if (!pa || !pb) continue;
      const dx = pb.x - pa.x, dy = pb.y - pa.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const force = (dist - 80) * 0.01 * alpha;
      pa.vx += (dx / dist) * force; pa.vy += (dy / dist) * force;
      pb.vx -= (dx / dist) * force; pb.vy -= (dy / dist) * force;
    }
    // Center gravity + apply
    for (const n of nodes) {
      const p = positions.get(n.id)!;
      p.vx += (cx - p.x) * 0.005 * alpha;
      p.vy += (cy - p.y) * 0.005 * alpha;
      p.vx *= 0.8; p.vy *= 0.8;
      p.x += p.vx; p.y += p.vy;
      p.x = Math.max(20, Math.min(W - 20, p.x));
      p.y = Math.max(20, Math.min(H - 20, p.y));
    }
  }

  const { canvas, ctx } = createCanvas(container);
  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

  // Draw edges
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
  for (const e of edges) {
    const pa = positions.get(e.source), pb = positions.get(e.target);
    if (!pa || !pb) continue;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
  }

  // Draw nodes
  for (const n of nodes) {
    const p = positions.get(n.id)!;
    const color = COLORS[(n.group ?? 0) % COLORS.length];
    ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    if (n.label) {
      ctx.font = '9px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(n.label, p.x, p.y + 10);
    }
  }

  return () => { canvas.remove(); };
}
