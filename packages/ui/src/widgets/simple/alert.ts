/**
 * Vanilla renderer for the AlertBlock widget.
 *
 * Contract:
 *   render(container, data) => cleanup()
 *
 * Mirrors AlertBlock.svelte — a simple left-bordered alert with optional
 * title and message, color-coded by severity level.
 */

export interface AlertBlockData {
  title?: string;
  message?: string;
  level?: 'info' | 'warn' | 'error';
}

type Level = 'info' | 'warn' | 'error';

function deriveBorderColor(level: Level | undefined): string {
  if (level === 'error') return 'border-accent2';
  if (level === 'info') return 'border-blue-500';
  return 'border-amber';
}

function deriveTitleColor(level: Level | undefined): string {
  if (level === 'error') return 'text-accent2';
  if (level === 'info') return 'text-blue-400';
  return 'text-amber';
}

function normalizeLevel(raw: unknown): Level | undefined {
  if (raw === 'info' || raw === 'warn' || raw === 'error') return raw;
  return undefined;
}

export function render(
  container: HTMLElement,
  data: Partial<AlertBlockData> | null | undefined
): () => void {
  const safe: Partial<AlertBlockData> = data && typeof data === 'object' ? data : {};
  const level = normalizeLevel(safe.level);
  const title = typeof safe.title === 'string' ? safe.title : '';
  const message = typeof safe.message === 'string' ? safe.message : '';

  const borderColor = deriveBorderColor(level);
  const titleColor = deriveTitleColor(level);

  // Clear target
  container.innerHTML = '';

  // Root
  const root = document.createElement('div');
  root.className = `p-3 md:p-4 border-l-4 ${borderColor}`;

  // Accessibility: role=alert for warn/error, status for info
  if (level === 'error' || level === 'warn') {
    root.setAttribute('role', 'alert');
    root.setAttribute('aria-live', 'assertive');
  } else {
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
  }

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.className = `font-semibold text-sm mb-1 ${titleColor}`;
    titleEl.textContent = title;
    root.appendChild(titleEl);
  }

  if (message) {
    const msgEl = document.createElement('div');
    msgEl.className = 'text-xs font-mono text-text2';
    msgEl.textContent = message;
    root.appendChild(msgEl);
  }

  // Click-to-interact (non-breaking: widget:interact bubbles up)
  const onClick = (ev: MouseEvent) => {
    container.dispatchEvent(
      new CustomEvent('widget:interact', {
        detail: {
          action: 'alert.click',
          payload: { level: level ?? null, title, message },
          originalEvent: ev,
        },
        bubbles: true,
      })
    );
  };
  root.addEventListener('click', onClick);

  container.appendChild(root);

  // Cleanup
  return () => {
    root.removeEventListener('click', onClick);
    container.innerHTML = '';
  };
}
