/** actions — Row of action buttons */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const buttons = (data.buttons as Array<{ label: string; primary?: boolean }>) ?? [];

  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:12px 16px;font-family:system-ui,sans-serif;display:flex;gap:8px;flex-wrap:wrap;';

  for (const btn of buttons) {
    const el = document.createElement('button');
    el.textContent = btn.label;
    el.style.cssText = btn.primary
      ? 'padding:6px 16px;border-radius:6px;border:none;background:#6c5ce7;color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:opacity 0.2s;'
      : 'padding:6px 16px;border-radius:6px;border:1px solid #555;background:transparent;color:#ccc;font-size:13px;cursor:pointer;transition:opacity 0.2s;';
    el.addEventListener('mouseenter', () => { el.style.opacity = '0.8'; });
    el.addEventListener('mouseleave', () => { el.style.opacity = '1'; });
    wrap.appendChild(el);
  }

  container.innerHTML = '';
  container.appendChild(wrap);
}
