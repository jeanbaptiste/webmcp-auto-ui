// @ts-nocheck
export async function createRoughSVG(container: HTMLElement, width = 500, height = 400) {
  const rough = (await import('roughjs')).default;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.width = '100%';
  svg.style.height = 'auto';
  container.appendChild(svg);
  const rc = rough.svg(svg);
  return { svg, rc, width, height };
}

export const COLORS = ['#8b5cf6','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];

export function addText(svg: SVGSVGElement, x: number, y: number, text: string, opts?: { fontSize?: number; anchor?: string; fill?: string }) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  el.setAttribute('x', String(x));
  el.setAttribute('y', String(y));
  el.setAttribute('text-anchor', opts?.anchor || 'middle');
  el.setAttribute('font-size', String(opts?.fontSize || 12));
  el.setAttribute('fill', opts?.fill || '#333');
  el.setAttribute('font-family', 'sans-serif');
  el.textContent = text;
  svg.appendChild(el);
  return el;
}
