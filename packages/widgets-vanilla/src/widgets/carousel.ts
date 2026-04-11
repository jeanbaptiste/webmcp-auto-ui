/** carousel — Slide carousel with prev/next navigation */
export function render(container: HTMLElement, data: Record<string, unknown>): (() => void) | void {
  const title = data.title as string | undefined;
  const slides = (data.slides as Array<{ src?: string; title?: string; subtitle?: string; content?: string }>) ?? [];
  const autoPlay = (data.autoPlay as boolean) ?? false;
  const interval = (data.interval as number) ?? 4000;

  if (!slides.length) {
    container.innerHTML = '<div style="padding:12px 16px;color:#888;font-size:12px;">Aucun slide</div>';
    return;
  }

  let current = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:12px 16px;font-family:system-ui,sans-serif;';

  function renderSlide() {
    const slide = slides[current];
    let html = '';
    if (title) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">${esc(title)}</div>`;

    html += '<div style="background:#1a1a2e;border:1px solid #333;border-radius:8px;overflow:hidden;">';
    if (slide.src) {
      html += `<img src="${esc(slide.src)}" alt="${esc(slide.title ?? '')}" style="width:100%;height:auto;max-height:300px;object-fit:cover;display:block;" />`;
    }
    html += '<div style="padding:12px;">';
    if (slide.title) html += `<div style="font-size:14px;font-weight:600;color:#e0e0e0;margin-bottom:4px;">${esc(slide.title)}</div>`;
    if (slide.subtitle) html += `<div style="font-size:11px;color:#888;margin-bottom:4px;">${esc(slide.subtitle)}</div>`;
    if (slide.content) html += `<div style="font-size:12px;color:#aaa;line-height:1.5;">${esc(slide.content)}</div>`;
    html += '</div></div>';

    // Navigation
    html += `<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:8px;">
      <button data-action="prev" style="padding:4px 12px;border-radius:4px;border:1px solid #555;background:transparent;color:#ccc;cursor:pointer;font-size:12px;">\u25C0 Prev</button>
      <span style="font-size:11px;color:#888;font-family:ui-monospace,monospace;">${current + 1} / ${slides.length}</span>
      <button data-action="next" style="padding:4px 12px;border-radius:4px;border:1px solid #555;background:transparent;color:#ccc;cursor:pointer;font-size:12px;">Next \u25B6</button>
    </div>`;

    wrap.innerHTML = html;
  }

  function handleClick(e: Event) {
    const btn = (e.target as HTMLElement).closest('button[data-action]') as HTMLElement | null;
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'prev') current = (current - 1 + slides.length) % slides.length;
    if (action === 'next') current = (current + 1) % slides.length;
    renderSlide();
  }

  wrap.addEventListener('click', handleClick);
  renderSlide();

  if (autoPlay) {
    timer = setInterval(() => {
      current = (current + 1) % slides.length;
      renderSlide();
    }, interval);
  }

  container.innerHTML = '';
  container.appendChild(wrap);

  return () => {
    wrap.removeEventListener('click', handleClick);
    if (timer) clearInterval(timer);
  };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
