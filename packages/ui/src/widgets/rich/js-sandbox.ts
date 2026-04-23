/**
 * JsSandbox vanilla renderer.
 *
 * Renders an iframe sandbox that executes user-provided JS + HTML + CSS in
 * isolation. Mirrors the Svelte version (JsSandbox.svelte) 1:1.
 */

export interface JsSandboxSpec {
  title?: string;
  code: string;
  html?: string;
  css?: string;
  height?: string;
}

export interface JsSandboxData {
  spec: JsSandboxSpec;
}

function buildSrcdoc(spec: JsSandboxSpec): string {
  const css = spec.css ?? '';
  const html = spec.html ?? '';
  const code = spec.code ?? '';
  // Neutral base: just reset box-sizing and remove body margin. NO default
  // colours — sandboxed iframes can't inherit the host's CSS custom properties,
  // so forcing a dark palette here would clash with user-provided `css` that
  // assumes the browser default (white bg, black text).
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{padding:8px;font-family:system-ui,sans-serif;font-size:13px}
${css}
</style>
</head>
<body>
<div id="root">${html}</div>
<script>
(function(){
try{
${code}
}catch(e){
document.getElementById('root').innerHTML='<pre style="color:red;white-space:pre-wrap;padding:8px;margin:0">'+e+'</pre>';
}
})();
<\/script>
</body>
</html>`;
}

export function render(container: HTMLElement, data: JsSandboxData | JsSandboxSpec | undefined): () => void {
  // Tolerate three shapes from callers:
  //   { spec: { code, html, css, ... } }   — explicit spec wrapper
  //   { code, html, css, ... }             — bare spec (widget_display params)
  //   undefined / {}                       — empty placeholder
  const raw = data ?? {};
  const spec: JsSandboxSpec = ('spec' in raw && raw.spec)
    ? (raw as JsSandboxData).spec
    : (raw as JsSandboxSpec);

  // Outer wrapper mirrors the Svelte markup classes.
  const wrapper = document.createElement('div');
  wrapper.className = 'bg-surface border border-border rounded-lg overflow-hidden font-sans';

  if (spec.title) {
    const header = document.createElement('div');
    header.className =
      'px-3 py-2 border-b border-border text-sm font-semibold text-text1 flex items-center gap-2';

    const tag = document.createElement('span');
    tag.className = 'text-xs opacity-50';
    tag.textContent = 'JS';
    header.appendChild(tag);

    header.appendChild(document.createTextNode(' ' + spec.title));
    wrapper.appendChild(header);
  }

  const iframe = document.createElement('iframe');
  // Exact sandbox flags from the Svelte source: allow-scripts only.
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.setAttribute('title', spec.title ?? 'JS Sandbox');
  iframe.style.width = '100%';
  iframe.style.height = spec.height ?? '300px';
  iframe.style.border = 'none';
  iframe.style.display = 'block';

  // Only build/assign srcdoc when we have code (or html) — otherwise render an
  // empty iframe placeholder. This matches the Svelte behaviour (srcdoc is
  // always computed) while being a touch more defensive for empty specs.
  if (spec && (spec.code || spec.html || spec.css)) {
    iframe.srcdoc = buildSrcdoc(spec);
  } else {
    iframe.srcdoc = buildSrcdoc({
      code: '',
      html: '<div style="opacity:.7;font-family:system-ui;font-size:13px;padding:12px">⚠ js-sandbox: no code/html/css provided.</div>',
      css: 'body{background:#f5f5f7;color:#333}',
    });
  }

  wrapper.appendChild(iframe);
  container.appendChild(wrapper);

  return () => {
    try {
      // Blank the iframe first to stop any running scripts cleanly.
      iframe.srcdoc = '';
    } catch {
      /* noop */
    }
    if (wrapper.parentNode === container) {
      container.removeChild(wrapper);
    } else {
      container.innerHTML = '';
    }
  };
}

export default { render };
