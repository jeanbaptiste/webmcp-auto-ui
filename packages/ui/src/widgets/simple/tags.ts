/**
 * Vanilla renderer for the Tags widget.
 *
 * Mirrors the Svelte TagsBlock.svelte component but uses imperative DOM
 * manipulation so it can be mounted without a framework.
 *
 * Contract:
 *   render(container, data) -> cleanup()
 *
 * Data shape:
 *   { label?: string; tags: Array<{ text: string; active?: boolean }> }
 *
 * Events:
 *   Dispatches a bubbling `widget:interact` CustomEvent on the container
 *   when a tag is activated (click / Enter / Space) with:
 *     detail: { action: 'tag:toggle', payload: { index, text, active } }
 */

export interface TagItem {
  text: string;
  active?: boolean;
}

export interface TagsBlockData {
  label?: string;
  tags: TagItem[];
}

type Cleanup = () => void;

const WRAPPER_CLASS = 'p-3 md:p-4 flex gap-2 flex-wrap items-center';
const LABEL_CLASS = 'text-[10px] font-mono text-text2';
const TAG_BASE_CLASS =
  'text-[11px] font-mono px-3 py-1 rounded-full border transition-colors';
const TAG_ACTIVE_CLASS = 'border-teal text-teal bg-teal/10';
const TAG_INACTIVE_CLASS = 'border-border2 text-text2';

export function render(container: HTMLElement, data: any): Cleanup {
  // Reset container
  container.innerHTML = '';

  const safeData: Partial<TagsBlockData> =
    data && typeof data === 'object' ? data : {};
  const tags: TagItem[] = Array.isArray(safeData.tags) ? safeData.tags : [];

  const wrapper = document.createElement('div');
  wrapper.className = WRAPPER_CLASS;
  wrapper.setAttribute('role', 'group');
  if (safeData.label) {
    wrapper.setAttribute('aria-label', String(safeData.label));
  }

  if (safeData.label) {
    const labelEl = document.createElement('span');
    labelEl.className = LABEL_CLASS;
    labelEl.textContent = String(safeData.label);
    wrapper.appendChild(labelEl);
  }

  // Robustness: empty tags -> render nothing beyond (possibly) the label.
  // If neither label nor tags, leave the wrapper empty silently.
  const listeners: Array<{
    el: HTMLElement;
    type: string;
    fn: EventListener;
  }> = [];

  tags.forEach((tag, index) => {
    if (!tag || typeof tag !== 'object') return;
    const text = tag.text == null ? '' : String(tag.text);
    const active = Boolean(tag.active);

    const chip = document.createElement('span');
    chip.className = `${TAG_BASE_CLASS} ${active ? TAG_ACTIVE_CLASS : TAG_INACTIVE_CLASS}`;
    chip.textContent = text;

    // a11y + interactivity
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    chip.dataset.index = String(index);

    const emit = () => {
      const ev = new CustomEvent('widget:interact', {
        detail: {
          action: 'tag:toggle',
          payload: { index, text, active },
        },
        bubbles: true,
      });
      container.dispatchEvent(ev);
    };

    const onClick: EventListener = (e) => {
      e.preventDefault();
      emit();
    };
    const onKey: EventListener = (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter' || ke.key === ' ') {
        ke.preventDefault();
        emit();
      }
    };

    chip.addEventListener('click', onClick);
    chip.addEventListener('keydown', onKey);
    listeners.push({ el: chip, type: 'click', fn: onClick });
    listeners.push({ el: chip, type: 'keydown', fn: onKey });

    wrapper.appendChild(chip);
  });

  container.appendChild(wrapper);

  return () => {
    for (const { el, type, fn } of listeners) {
      el.removeEventListener(type, fn);
    }
    listeners.length = 0;
    container.innerHTML = '';
  };
}

export default { render };
