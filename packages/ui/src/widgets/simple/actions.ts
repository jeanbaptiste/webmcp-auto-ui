/**
 * Vanilla renderer for the Actions widget.
 *
 * Mirrors the Svelte version in `ActionsBlock.svelte`:
 * renders a flex-wrap row of buttons. Each button may carry its own
 * `onclick` handler (preserved from the Svelte shape). When no handler is
 * provided, a `widget:interact` CustomEvent is dispatched on the container
 * with `{ action: 'action-click', payload: { action: <label>, index } }`.
 */

export interface ActionButton {
  label: string;
  primary?: boolean;
  onclick?: () => void;
}

export interface ActionsBlockData {
  buttons: ActionButton[];
}

export function render(container: HTMLElement, data: Partial<ActionsBlockData> | undefined | null): () => void {
  // Reset the container.
  container.innerHTML = '';

  const buttons: ActionButton[] = Array.isArray(data?.buttons) ? (data!.buttons as ActionButton[]) : [];

  const root = document.createElement('div');
  root.className = 'p-3 md:p-4 flex gap-2 flex-wrap';
  root.setAttribute('role', 'group');

  // Nothing to render: keep the empty wrapper (stays consistent with Svelte output).
  if (buttons.length === 0) {
    container.appendChild(root);
    return () => {
      container.innerHTML = '';
    };
  }

  // Track listeners so we can clean up precisely.
  const listeners: Array<{ el: HTMLButtonElement; handler: (ev: Event) => void }> = [];

  buttons.forEach((btn, index) => {
    const el = document.createElement('button');
    el.type = 'button';

    const base = 'text-xs font-mono px-4 py-2 rounded border transition-all';
    const variant = btn.primary
      ? 'bg-accent border-accent text-white hover:opacity-85'
      : 'border-border2 text-text2 hover:border-accent hover:text-accent';
    el.className = `${base} ${variant}`;

    el.textContent = btn.label ?? '';
    el.setAttribute('aria-label', btn.label ?? `action-${index}`);

    const handler = (_ev: Event) => {
      if (typeof btn.onclick === 'function') {
        try {
          btn.onclick();
        } catch (err) {
          console.error('[actions widget] onclick handler threw', err);
        }
        return;
      }
      container.dispatchEvent(
        new CustomEvent('widget:interact', {
          detail: {
            action: 'action-click',
            payload: { action: btn.label, index },
          },
          bubbles: true,
        })
      );
    };

    el.addEventListener('click', handler);
    listeners.push({ el, handler });
    root.appendChild(el);
  });

  container.appendChild(root);

  return () => {
    for (const { el, handler } of listeners) {
      el.removeEventListener('click', handler);
    }
    listeners.length = 0;
    container.innerHTML = '';
  };
}
