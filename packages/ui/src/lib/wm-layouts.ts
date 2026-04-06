export interface ManagedWindow {
  id: string; title: string; visible: boolean; focused: boolean;
  folded: boolean; weight: number; createdAt: number; lastFocusedAt: number;
}
export interface LayoutWindow {
  id: string; x: number; y: number; width: number; height: number;
  zIndex: number; visible: boolean; folded: boolean;
}
export interface LayoutOptions { containerWidth: number; containerHeight: number; gap?: number; padding?: number; }
export interface FloatingWindowState { x: number; y: number; width: number; height: number; zIndex: number; }

export function assignWeights(windows: ManagedWindow[]): ManagedWindow[] {
  const sorted = [...windows].sort((a, b) => b.createdAt - a.createdAt);
  const w = [3, 2, 1.5];
  return sorted.map((win, i) => ({ ...win, weight: w[i] ?? 1 }));
}

export function computeTilingLayout(windows: ManagedWindow[], o: LayoutOptions & { ratio?: number; minRatio?: number; maxRatio?: number; foldedHeight?: number; ratioOverrides?: Record<number, number> }): LayoutWindow[] {
  const vis = windows.filter(w => w.visible);
  if (!vis.length) return [];
  const gap = o.gap ?? 4, pad = o.padding ?? 0, fh = o.foldedHeight ?? 32;
  const sorted = [...vis].sort((a, b) => b.weight - a.weight);
  const result: LayoutWindow[] = [];
  spiral(sorted, 0, pad, pad, o.containerWidth - pad*2, o.containerHeight - pad*2, 0, gap, o.ratio??0.6, o.minRatio??0.15, o.maxRatio??0.85, fh, o.ratioOverrides??{}, result);
  return result;
}

function spiral(wins: ManagedWindow[], i: number, x: number, y: number, w: number, h: number, d: number, gap: number, ratio: number, min: number, max: number, fh: number, ov: Record<number,number>, r: LayoutWindow[]): void {
  if (i >= wins.length) return;
  const win = wins[i];
  if (i === wins.length - 1) { r.push({ id: win.id, x, y, width: w, height: win.folded ? fh : h, zIndex: wins.length-i, visible: true, folded: win.folded }); return; }
  const rat = Math.min(max, Math.max(min, ov[d] ?? ratio));
  if (d % 2 === 0) {
    const lw = Math.floor((w - gap) * rat);
    r.push({ id: win.id, x, y, width: lw, height: win.folded ? fh : h, zIndex: wins.length-i, visible: true, folded: win.folded });
    spiral(wins, i+1, x+lw+gap, y, w-lw-gap, h, d+1, gap, ratio, min, max, fh, ov, r);
  } else {
    const th = Math.floor((h - gap) * rat);
    r.push({ id: win.id, x, y, width: w, height: win.folded ? fh : th, zIndex: wins.length-i, visible: true, folded: win.folded });
    spiral(wins, i+1, x, y+th+gap, w, h-th-gap, d+1, gap, ratio, min, max, fh, ov, r);
  }
}

export function computeFloatingLayout(windows: ManagedWindow[], o: LayoutOptions & { defaultWidth?: number; defaultHeight?: number; cascadeOffset?: number; foldedHeight?: number }, saved?: Map<string, FloatingWindowState>): LayoutWindow[] {
  const dw=o.defaultWidth??400, dh=o.defaultHeight??300, cas=o.cascadeOffset??30, fh=o.foldedHeight??32, pad=o.padding??0;
  const vis = windows.filter(w => w.visible).sort((a,b) => a.lastFocusedAt - b.lastFocusedAt);
  const result: LayoutWindow[] = []; let nc = 0;
  for (let i = 0; i < vis.length; i++) {
    const win = vis[i]; const s = saved?.get(win.id);
    if (s) { result.push({ id: win.id, x: s.x, y: s.y, width: s.width, height: win.folded ? fh : s.height, zIndex: i+1, visible: true, folded: win.folded }); }
    else {
      const x = pad + (nc*cas) % Math.max(1, o.containerWidth-dw-pad*2);
      const y = pad + (nc*cas) % Math.max(1, o.containerHeight-dh-pad*2);
      nc++;
      result.push({ id: win.id, x, y, width: dw, height: win.folded ? fh : dh, zIndex: i+1, visible: true, folded: win.folded });
    }
  }
  return result;
}

export function bringToFront(layout: LayoutWindow[], id: string): LayoutWindow[] {
  const max = Math.max(...layout.map(l => l.zIndex));
  return layout.map(l => l.id === id ? { ...l, zIndex: max+1 } : l);
}

export function computeStackLayout(windows: ManagedWindow[], o: LayoutOptions & { mode?: 'single'|'scroll'; headerHeight?: number; foldedHeight?: number; itemGap?: number; minItemHeight?: number }): LayoutWindow[] {
  const vis = windows.filter(w => w.visible);
  if (!vis.length) return [];
  if ((o.mode ?? 'scroll') === 'single') return singleStack(vis, o);
  return scrollStack(vis, o);
}

function singleStack(wins: ManagedWindow[], o: LayoutOptions & { headerHeight?: number; foldedHeight?: number }): LayoutWindow[] {
  const hh=o.headerHeight??48, fh=o.foldedHeight??40, gap=o.gap??4, pad=o.padding??0;
  const ai = Math.max(0, wins.findIndex(w => w.focused));
  const result: LayoutWindow[] = []; let y = pad;
  for (let i = 0; i < wins.length; i++) {
    const w = wins[i];
    if (w.folded) { result.push({ id: w.id, x: pad, y, width: o.containerWidth-pad*2, height: fh, zIndex: 1, visible: true, folded: true }); y += fh+gap; }
    else if (i === ai) {
      const h = Math.max(100, o.containerHeight-pad*2-(wins.length-1)*(hh+gap)-gap);
      result.push({ id: w.id, x: pad, y, width: o.containerWidth-pad*2, height: h, zIndex: wins.length, visible: true, folded: false }); y += h+gap;
    } else { result.push({ id: w.id, x: pad, y, width: o.containerWidth-pad*2, height: hh, zIndex: i, visible: true, folded: false }); y += hh+gap; }
  }
  return result;
}

function scrollStack(wins: ManagedWindow[], o: LayoutOptions & { itemGap?: number; foldedHeight?: number; minItemHeight?: number }): LayoutWindow[] {
  const gap=o.itemGap??8, pad=o.padding??0, fh=o.foldedHeight??40, min=o.minItemHeight??200;
  const width = o.containerWidth - pad*2;
  const unfolded = wins.filter(w => !w.folded);
  const totalW = unfolded.reduce((s, w) => s+w.weight, 0);
  const foldedSpace = (wins.length-unfolded.length)*(fh+gap);
  const avail = o.containerHeight-pad*2-foldedSpace-(unfolded.length-1)*gap;
  const result: LayoutWindow[] = []; let y = pad;
  for (const w of wins) {
    if (w.folded) { result.push({ id: w.id, x: pad, y, width, height: fh, zIndex: 1, visible: true, folded: true }); y += fh+gap; }
    else { const h = Math.max(min, totalW>0 ? Math.floor(avail*(w.weight/totalW)) : min); result.push({ id: w.id, x: pad, y, width, height: h, zIndex: 1, visible: true, folded: false }); y += h+gap; }
  }
  return result;
}
