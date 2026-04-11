/** js-sandbox — Isolated JavaScript sandbox via iframe */
export function render(container: HTMLElement, data: Record<string, unknown>): (() => void) | void {
  const title = data.title as string | undefined;
  const code = (data.code as string) ?? '';
  const html = (data.html as string) ?? '';
  const css = (data.css as string) ?? '';
  const height = (data.height as string) ?? '200px';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:12px 16px;font-family:system-ui,sans-serif;';

  if (title) {
    const h = document.createElement('div');
    h.style.cssText = 'font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;';
    h.textContent = title;
    wrap.appendChild(h);
  }

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width:100%;height:${height};border:1px solid #333;border-radius:6px;background:#0d0d1a;`;
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.setAttribute('referrerpolicy', 'no-referrer');

  const srcDoc = `<!DOCTYPE html>
<html><head><style>
body { margin:0; padding:8px; font-family:system-ui,sans-serif; color:#e0e0e0; background:#0d0d1a; }
${css}
</style></head><body>
<div id="root">${html}</div>
<script>
try { ${code} } catch(e) { document.getElementById('root').innerHTML = '<pre style="color:#e17055;">' + e.message + '</pre>'; }
<\/script>
</body></html>`;

  iframe.srcdoc = srcDoc;
  wrap.appendChild(iframe);

  container.innerHTML = '';
  container.appendChild(wrap);

  return () => {
    iframe.srcdoc = '';
    iframe.remove();
  };
}
