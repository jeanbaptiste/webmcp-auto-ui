/** code — Code block with basic syntax display */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const lang = (data.lang as string) ?? '';
  const content = (data.content as string) ?? '';

  container.innerHTML = `
    <div style="padding:12px 16px;font-family:system-ui,sans-serif;">
      ${lang ? `<div style="font-size:9px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${esc(lang)}</div>` : ''}
      <pre style="margin:0;padding:12px;background:#1a1a2e;border-radius:6px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.5;color:#e0e0e0;border:1px solid #333;"><code>${esc(content)}</code></pre>
    </div>
  `;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
