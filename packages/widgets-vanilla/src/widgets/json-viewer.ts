/** json-viewer — Interactive JSON tree viewer */
export function render(container: HTMLElement, data: Record<string, unknown>): (() => void) | void {
  const title = data.title as string | undefined;
  const jsonData = data.data;
  const maxDepth = (data.maxDepth as number) ?? 5;
  const expanded = (data.expanded as boolean) ?? false;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:12px 16px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;';

  if (title) {
    const h = document.createElement('div');
    h.style.cssText = 'font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;';
    h.textContent = title;
    wrap.appendChild(h);
  }

  const tree = document.createElement('div');
  tree.style.cssText = 'background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px;overflow-x:auto;';

  function buildNode(value: unknown, depth: number, key?: string): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `padding-left:${depth * 16}px;line-height:1.6;`;

    if (value === null || value === undefined || typeof value !== 'object') {
      // Scalar
      let color = '#e0e0e0';
      let display = String(value);
      if (typeof value === 'string') { color = '#a6e22e'; display = `"${value}"`; }
      else if (typeof value === 'number') { color = '#ae81ff'; }
      else if (typeof value === 'boolean') { color = '#66d9ef'; }
      else if (value === null) { color = '#888'; display = 'null'; }

      row.innerHTML = (key !== undefined ? `<span style="color:#f92672;">${esc(key)}</span><span style="color:#888;">: </span>` : '') +
        `<span style="color:${color};">${esc(display)}</span>`;
      return row;
    }

    const isArray = Array.isArray(value);
    const entries = isArray ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown]) : Object.entries(value as Record<string, unknown>);
    const bracket = isArray ? ['[', ']'] : ['{', '}'];

    if (depth >= maxDepth) {
      row.innerHTML = (key !== undefined ? `<span style="color:#f92672;">${esc(key)}</span><span style="color:#888;">: </span>` : '') +
        `<span style="color:#888;">${bracket[0]}...${bracket[1]}</span>`;
      return row;
    }

    const toggle = document.createElement('span');
    toggle.style.cssText = 'cursor:pointer;user-select:none;';
    let isOpen = expanded;

    const keySpan = key !== undefined ? `<span style="color:#f92672;">${esc(key)}</span><span style="color:#888;">: </span>` : '';

    const childContainer = document.createElement('div');
    for (const [ck, cv] of entries) {
      childContainer.appendChild(buildNode(cv, depth + 1, ck));
    }

    function updateToggle() {
      toggle.innerHTML = keySpan + `<span style="color:#888;">${isOpen ? '\u25BC' : '\u25B6'} ${bracket[0]}${!isOpen ? `${entries.length}${bracket[1]}` : ''}</span>`;
      childContainer.style.display = isOpen ? 'block' : 'none';
    }

    toggle.addEventListener('click', () => { isOpen = !isOpen; updateToggle(); });
    updateToggle();

    row.appendChild(toggle);
    row.appendChild(childContainer);

    if (entries.length > 0) {
      const closeBracket = document.createElement('div');
      closeBracket.style.cssText = `padding-left:${depth * 16}px;color:#888;`;
      closeBracket.textContent = bracket[1];
      childContainer.appendChild(closeBracket);
    }

    return row;
  }

  tree.appendChild(buildNode(jsonData, 0));
  wrap.appendChild(tree);

  container.innerHTML = '';
  container.appendChild(wrap);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
