/**
 * Vanilla renderer for the "code" widget.
 *
 * Contract:
 *   render(container, data) => cleanup()
 *
 * Data shape: { lang?: string; content?: string }
 *
 * Security: uses textContent (never innerHTML) for the code source to avoid XSS.
 */

export interface CodeBlockData {
  lang?: string;
  content?: string;
}

export function render(container: HTMLElement, data: any): () => void {
  // Defensive normalization
  const safe: CodeBlockData =
    data && typeof data === 'object' ? (data as CodeBlockData) : {};
  const lang = typeof safe.lang === 'string' && safe.lang.length > 0 ? safe.lang : 'text';
  const content = typeof safe.content === 'string' ? safe.content : '';

  // Clear container before mounting
  container.innerHTML = '';

  // Root wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'rounded overflow-hidden';

  // Header bar showing the language
  const header = document.createElement('div');
  header.className = 'bg-black/40 px-3 py-1.5 md:px-4 border-b border-border';

  const langLabel = document.createElement('span');
  langLabel.className = 'text-[10px] font-mono text-text2';
  langLabel.textContent = lang;
  // A11y: expose the language for assistive tech
  langLabel.setAttribute('aria-label', `Language: ${lang}`);
  header.appendChild(langLabel);

  // Code block (<pre><code> for semantics + a11y)
  const pre = document.createElement('pre');
  pre.className =
    'font-mono text-xs text-teal bg-black/30 p-3 md:p-4 overflow-x-auto leading-relaxed';
  // A11y: code regions are useful as landmarks for screen readers
  pre.setAttribute('tabindex', '0');
  pre.setAttribute('role', 'region');
  pre.setAttribute('aria-label', `Code block (${lang})`);

  const code = document.createElement('code');
  // Hint for assistive tech + syntax highlighters (e.g. highlight.js, prism)
  code.className = `language-${lang}`;
  // IMPORTANT: textContent, never innerHTML — prevents XSS.
  code.textContent = content;
  pre.appendChild(code);

  wrapper.appendChild(header);
  wrapper.appendChild(pre);
  container.appendChild(wrapper);

  // Interaction: emit a "copy" intent when the user double-clicks the code.
  // Consumers can listen via container.addEventListener('widget:interact', ...).
  const onDblClick = () => {
    container.dispatchEvent(
      new CustomEvent('widget:interact', {
        detail: { action: 'copy', payload: { lang, content } },
        bubbles: true,
      })
    );
  };
  pre.addEventListener('dblclick', onDblClick);

  // Cleanup: remove listeners and wipe DOM
  return () => {
    pre.removeEventListener('dblclick', onDblClick);
    container.innerHTML = '';
  };
}
