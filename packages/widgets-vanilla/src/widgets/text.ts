/** text — Free text paragraph */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const content = (data.content as string) ?? '';

  container.innerHTML = `
    <div style="padding:12px 16px;font-family:system-ui,sans-serif;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#e0e0e0;">${esc(content)}</p>
    </div>
  `;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
