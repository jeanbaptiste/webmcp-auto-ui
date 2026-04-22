/**
 * Vanilla renderer for the "list" widget.
 *
 * Mirrors ListBlock.svelte:
 *  - optional title
 *  - items rendered as <li> with Tailwind classes
 *  - double-click (and Enter/Space for a11y) dispatches a bubbling
 *    `widget:interact` CustomEvent with { action: 'itemclick', payload: { item, index } }
 */

export interface ListBlockData {
  title?: string;
  items: string[];
}

type Cleanup = () => void;

export function render(container: HTMLElement, data: Partial<ListBlockData>): Cleanup {
  // Reset container
  container.innerHTML = '';

  const items = Array.isArray(data?.items) ? data!.items : [];
  const title = typeof data?.title === 'string' ? data!.title : undefined;

  const wrapper = document.createElement('div');
  wrapper.className = 'p-3 md:p-4';

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.className =
      'text-[10px] font-mono text-text2 mb-3 uppercase tracking-widest';
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);
  }

  const ul = document.createElement('ul');
  ul.className = 'flex flex-col gap-1.5';

  // Track listeners for cleanup
  const disposers: Array<() => void> = [];

  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className =
      'text-sm text-text1 bg-surface2 rounded px-3 py-2 border-l-2 border-accent cursor-pointer hover:bg-surface2/80';
    li.title = 'Double-cliquez pour interagir';
    li.textContent = String(item);

    // a11y: make keyboard-interactive
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');

    const fire = () => {
      container.dispatchEvent(
        new CustomEvent('widget:interact', {
          detail: { action: 'itemclick', payload: { item, index: i } },
          bubbles: true,
        })
      );
    };

    const onDblClick = () => fire();
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        ev.preventDefault();
        fire();
      }
    };

    li.addEventListener('dblclick', onDblClick);
    li.addEventListener('keydown', onKeyDown);

    disposers.push(() => {
      li.removeEventListener('dblclick', onDblClick);
      li.removeEventListener('keydown', onKeyDown);
    });

    ul.appendChild(li);
  });

  wrapper.appendChild(ul);
  container.appendChild(wrapper);

  return () => {
    for (const d of disposers) d();
    disposers.length = 0;
    container.innerHTML = '';
  };
}
