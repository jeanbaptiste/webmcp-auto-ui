/** sankey — Sankey flow diagram (simplified CSS-based) */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const nodes = (data.nodes as Array<{ id: string; label: string; color?: string }>) ?? [];
  const links = (data.links as Array<{ source: string; target: string; value: number }>) ?? [];

  if (!nodes.length || !links.length) {
    container.innerHTML = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;color:#888;font-size:12px;">Aucune donn\u00E9e de flux</div>';
    return;
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const maxVal = Math.max(...links.map(l => l.value), 1);
  const sorted = [...links].sort((a, b) => b.value - a.value);

  let html = `<div style="padding:12px 16px;font-family:system-ui,sans-serif;background:#1a1a2e;border:1px solid #333;border-radius:8px;">`;
  if (title) html += `<div style="font-size:14px;font-weight:600;color:#e0e0e0;margin-bottom:8px;">${esc(title)}</div>`;
  html += `<div style="font-size:10px;color:#888;font-family:ui-monospace,monospace;margin-bottom:8px;">${nodes.length} n\u0153uds \u00B7 ${links.length} flux</div>`;
  html += '<div style="display:flex;flex-direction:column;gap:6px;">';

  for (const link of sorted) {
    const src = nodeMap.get(link.source);
    const tgt = nodeMap.get(link.target);
    const sc = src?.color ?? '#6c5ce7';
    const tc = tgt?.color ?? '#00b894';
    const pct = Math.round((link.value / maxVal) * 100);
    const barH = Math.max(4, Math.round((link.value / maxVal) * 20));

    html += `<div style="display:flex;align-items:center;gap:8px;font-size:11px;">
      <span style="min-width:80px;color:${esc(sc)};font-family:ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(src?.label ?? link.source)}</span>
      <div style="flex:1;background:#222;border-radius:10px;overflow:hidden;height:${barH}px;">
        <div style="width:${pct}%;height:100%;border-radius:10px;background:linear-gradient(to right, ${esc(sc)}, ${esc(tc)});"></div>
      </div>
      <span style="min-width:80px;text-align:right;color:${esc(tc)};font-family:ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(tgt?.label ?? link.target)}</span>
      <span style="min-width:40px;text-align:right;color:#888;font-family:ui-monospace,monospace;">${link.value}</span>
    </div>`;
  }

  html += '</div></div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
