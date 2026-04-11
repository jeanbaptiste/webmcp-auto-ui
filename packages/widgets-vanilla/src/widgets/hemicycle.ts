/** hemicycle — Parliamentary hemicycle with SVG arcs */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const groups = (data.groups as Array<{ id: string; label: string; seats: number; color: string }>) ?? [];
  const totalSeats = (data.totalSeats as number) ?? groups.reduce((s, g) => s + g.seats, 0);

  if (!groups.length || !totalSeats) {
    container.innerHTML = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;color:#888;font-size:13px;">Aucune donn\u00E9e</div>';
    return;
  }

  const W = 420, H = 230, cx = W / 2, cy = H - 10, rMin = 60, step = 28;
  const rows = Math.min(Math.max(3, Math.ceil(Math.sqrt(totalSeats / 6))), 7);

  // Compute seats per row
  const radii = Array.from({ length: rows }, (_, i) => rMin + i * step);
  const circs = radii.map(r => Math.PI * r);
  const totalC = circs.reduce((a, b) => a + b, 0);
  const spr = radii.map(r => Math.round(Math.PI * r / totalC * totalSeats));
  spr[spr.length - 1] += totalSeats - spr.reduce((a, b) => a + b, 0);

  // Build color array sorted by seats ascending
  const sorted = [...groups].sort((a, b) => a.seats - b.seats);
  const colors: { color: string; gid: string }[] = [];
  for (const g of sorted) for (let i = 0; i < g.seats; i++) colors.push({ color: g.color, gid: g.id });
  while (colors.length < totalSeats) colors.push({ color: '#333355', gid: '' });

  // Generate seat positions
  let svgContent = '';
  let idx = 0;
  const rMax = rMin + rows * step;

  // Background arc
  svgContent += `<path d="M ${cx - rMax - 15} ${cy} A ${rMax + 15} ${rMax + 15} 0 0 1 ${cx + rMax + 15} ${cy}" fill="none" stroke="#333" stroke-width="2"/>`;

  for (let row = 0; row < rows; row++) {
    const r = radii[row], n = spr[row];
    for (let j = 0; j < n; j++) {
      if (idx >= colors.length) break;
      const angle = Math.PI - (j / (n - 1 || 1)) * Math.PI;
      const x = (cx + r * Math.cos(angle)).toFixed(1);
      const y = (cy - r * Math.sin(angle)).toFixed(1);
      const c = colors[idx++];
      svgContent += `<circle cx="${x}" cy="${y}" r="4" fill="${esc(c.color)}" opacity="0.9"><title>${esc(groups.find(g => g.id === c.gid)?.label ?? '')}</title></circle>`;
    }
  }

  // Total label
  svgContent += `<text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="11" fill="#888" font-family="system-ui">${totalSeats} si\u00E8ges</text>`;

  // Legend
  const legendGroups = [...groups].sort((a, b) => b.seats - a.seats);
  let legendHtml = '<div style="display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:12px;">';
  for (const g of legendGroups) {
    legendHtml += `<div style="display:flex;align-items:center;gap:6px;font-size:11px;">
      <div style="width:12px;height:12px;border-radius:50%;background:${esc(g.color)};flex-shrink:0;"></div>
      <span style="color:#888;">${esc(g.label)}</span>
      <span style="color:#888;">${g.seats}</span>
    </div>`;
  }
  legendHtml += '</div>';

  container.innerHTML = `
    <div style="padding:12px 16px;font-family:system-ui,sans-serif;background:#1a1a2e;border:1px solid #333;border-radius:8px;">
      ${title ? `<div style="font-size:14px;font-weight:600;color:#e0e0e0;margin-bottom:12px;">${esc(title)}</div>` : ''}
      <svg viewBox="0 0 ${W} ${H}" style="display:block;width:100%;max-height:220px;" xmlns="http://www.w3.org/2000/svg">
        ${svgContent}
      </svg>
      ${legendHtml}
    </div>
  `;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
