/** d3 — Simplified D3 preset visualizations (no D3 dependency — pure CSS/HTML) */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const preset = (data.preset as string) ?? '';
  const rawData = data.data as Record<string, unknown> | undefined;

  let html = `<div style="padding:12px 16px;font-family:system-ui,sans-serif;background:#1a1a2e;border:1px solid #333;border-radius:8px;">`;
  if (title) html += `<div style="font-size:14px;font-weight:600;color:#e0e0e0;margin-bottom:8px;">${esc(title)}</div>`;
  html += `<div style="font-size:9px;color:#555;font-family:ui-monospace,monospace;margin-bottom:8px;">preset: ${esc(preset)} (vanilla)</div>`;

  switch (preset) {
    case 'hex-heatmap':
      html += renderHeatmap(rawData);
      break;
    case 'treemap':
      html += renderTreemap(rawData);
      break;
    case 'radial':
      html += renderRadial(rawData);
      break;
    case 'force':
      html += renderForce(rawData);
      break;
    default:
      html += `<div style="color:#888;font-size:12px;">Preset inconnu: ${esc(preset)}</div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

function renderHeatmap(data: Record<string, unknown> | undefined): string {
  const values = (data?.values as number[][]) ?? [];
  if (!values.length) return '<div style="color:#888;font-size:12px;">Aucune donn\u00E9e (values)</div>';

  const allVals = values.flat();
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;

  let html = '<div style="display:flex;flex-direction:column;gap:2px;">';
  for (const row of values) {
    html += '<div style="display:flex;gap:2px;">';
    for (const val of row) {
      const intensity = Math.round(((val - min) / range) * 255);
      const color = `rgb(${Math.round(intensity * 0.4)}, ${Math.round(intensity * 0.35)}, ${intensity})`;
      html += `<div style="width:14px;height:14px;border-radius:2px;background:${color};" title="${val}"></div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderTreemap(data: Record<string, unknown> | undefined): string {
  type TreeNode = { name: string; value?: number; children?: TreeNode[] };
  const children = ((data as TreeNode | undefined)?.children ?? []) as TreeNode[];
  if (!children.length) return '<div style="color:#888;font-size:12px;">Aucune donn\u00E9e (children)</div>';

  // Flatten to leaves and render as proportional bars
  const leaves: { name: string; value: number }[] = [];
  function collect(nodes: TreeNode[]) {
    for (const n of nodes) {
      if (n.children?.length) collect(n.children);
      else leaves.push({ name: n.name, value: n.value ?? 1 });
    }
  }
  collect(children);
  leaves.sort((a, b) => b.value - a.value);
  const total = leaves.reduce((s, l) => s + l.value, 0);
  const colors = ['#6c5ce7', '#0984e3', '#00b894', '#fdcb6e', '#e17055', '#e84393', '#74b9ff', '#55efc4'];

  let html = '<div style="display:flex;flex-wrap:wrap;gap:2px;">';
  leaves.forEach((leaf, i) => {
    const pct = Math.max(2, Math.round((leaf.value / total) * 100));
    html += `<div style="flex:0 0 calc(${pct}% - 2px);min-width:40px;background:${colors[i % colors.length]};border-radius:4px;padding:4px 6px;font-size:10px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(leaf.name)}: ${leaf.value}">
      ${esc(leaf.name)} <span style="opacity:0.7;">${leaf.value}</span>
    </div>`;
  });
  html += '</div>';
  return html;
}

function renderRadial(data: Record<string, unknown> | undefined): string {
  const segments = (data?.segments as Array<{ label: string; value: number; color?: string }>) ?? [];
  if (!segments.length) return '<div style="color:#888;font-size:12px;">Aucune donn\u00E9e (segments)</div>';

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const colors = ['#6c5ce7', '#e17055', '#00b894', '#fdcb6e', '#0984e3', '#e84393'];
  const size = 180, cx = size / 2, cy = size / 2, r = size / 2 - 5;
  const innerR = r * 0.4;

  let svgContent = '';
  let startAngle = -Math.PI / 2;

  segments.forEach((seg, i) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const color = seg.color ?? colors[i % colors.length];

    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle), iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle), iy2 = cy + innerR * Math.sin(startAngle);

    svgContent += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix1.toFixed(1)},${iy1.toFixed(1)} A${innerR},${innerR} 0 ${largeArc},0 ${ix2.toFixed(1)},${iy2.toFixed(1)} Z" fill="${color}" stroke="#1a1a2e" stroke-width="2"><title>${esc(seg.label)}: ${seg.value}</title></path>`;
    startAngle = endAngle;
  });

  return `<div style="display:flex;justify-content:center;"><svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px;" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg></div>`;
}

function renderForce(data: Record<string, unknown> | undefined): string {
  type FNode = { id: string; label?: string; group?: number };
  type FLink = { source: string; target: string; value?: number };
  const nodes = (data?.nodes as FNode[]) ?? [];
  const links = (data?.links as FLink[]) ?? [];

  if (!nodes.length) return '<div style="color:#888;font-size:12px;">Aucune donn\u00E9e (nodes)</div>';

  const colors = ['#6c5ce7', '#e17055', '#00b894', '#fdcb6e', '#0984e3', '#e84393'];

  // Render as adjacency list
  let html = `<div style="font-size:11px;color:#888;font-family:ui-monospace,monospace;margin-bottom:6px;">${nodes.length} n\u0153uds \u00B7 ${links.length} liens</div>`;
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
  for (const node of nodes) {
    const color = colors[(node.group ?? 0) % colors.length];
    const conns = links.filter(l => l.source === node.id || l.target === node.id).length;
    html += `<div style="display:flex;align-items:center;gap:4px;padding:4px 8px;background:#111;border-radius:4px;border:1px solid #333;">
      <div style="width:10px;height:10px;border-radius:50%;background:${color};"></div>
      <span style="font-size:11px;color:#e0e0e0;">${esc(node.label ?? node.id)}</span>
      <span style="font-size:9px;color:#555;">(${conns})</span>
    </div>`;
  }
  html += '</div>';

  if (links.length) {
    html += '<div style="margin-top:8px;display:flex;flex-direction:column;gap:2px;max-height:150px;overflow-y:auto;">';
    for (const link of links) {
      html += `<div style="font-size:10px;color:#555;font-family:ui-monospace,monospace;">${esc(link.source)} \u2192 ${esc(link.target)}${link.value !== undefined ? ` (${link.value})` : ''}</div>`;
    }
    html += '</div>';
  }

  return html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
