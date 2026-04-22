/**
 * Cards (vanilla) — grid of cards with optional image, subtitle, description, tags.
 * Mirrors Cards.svelte. Interactive mode: cards are clickable (dblclick + Enter/Space).
 *
 * Contract:
 *   render(container, data) -> cleanup()
 * Event:
 *   'widget:interact' { action: 'cardclick', payload: card }
 */

import { createSafeImage } from '../helpers/safe-image.js';

export interface CardItem {
  title: string;
  description?: string;
  subtitle?: string;
  image?: string;
  tags?: string[];
  href?: string;
}

export interface CardsSpec {
  title?: string;
  cards?: CardItem[];
  minCardWidth?: string;
  gap?: string;
  emptyMessage?: string;
  interactive?: boolean;
}

interface CardsPayload {
  spec?: Partial<CardsSpec>;
  data?: unknown;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function resolveCards(spec: Partial<CardsSpec>, data: unknown): CardItem[] {
  if (Array.isArray(spec.cards) && spec.cards.length) return spec.cards as CardItem[];
  if (Array.isArray(data)) {
    return (data as Record<string, unknown>[]).map((d) => ({
      title: String(d.title ?? d.name ?? d.label ?? JSON.stringify(d)),
      description: typeof d.description === 'string' ? (d.description as string) : undefined,
      subtitle: typeof d.subtitle === 'string' ? (d.subtitle as string) : undefined,
    }));
  }
  return [];
}

export function render(container: HTMLElement, data: any): () => void {
  const payload: CardsPayload = (data && typeof data === 'object' ? data : {}) as CardsPayload;
  const spec: Partial<CardsSpec> = payload.spec ?? {};
  const inner = payload.data;
  const interactive = spec.interactive === true;
  const cards = resolveCards(spec, inner);

  // Root
  const root = document.createElement('div');
  root.className = 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans';

  if (spec.title) {
    const h3 = document.createElement('h3');
    h3.className = 'text-sm font-semibold text-text1 mb-3';
    h3.textContent = spec.title;
    root.appendChild(h3);
  }

  // Tracked listeners for cleanup
  const listeners: Array<{ el: HTMLElement; type: string; handler: EventListener }> = [];
  const addL = (el: HTMLElement, type: string, handler: EventListener) => {
    el.addEventListener(type, handler);
    listeners.push({ el, type, handler });
  };

  if (cards.length === 0) {
    const p = document.createElement('p');
    p.className = 'text-text2 text-sm';
    p.textContent = spec.emptyMessage ?? 'No items';
    root.appendChild(p);
  } else {
    const grid = document.createElement('div');
    grid.className = 'grid';
    const minW = spec.minCardWidth ?? '180px';
    const gap = spec.gap ?? '1rem';
    grid.setAttribute('style', `grid-template-columns: repeat(auto-fill, minmax(${minW}, 1fr)); gap: ${gap};`);

    for (const card of cards) {
      const cardEl = document.createElement('div');
      cardEl.className =
        'bg-surface2 border border-border rounded-lg overflow-hidden hover:border-border2 transition-all' +
        (interactive ? ' cursor-pointer' : '');
      if (interactive) {
        cardEl.setAttribute('role', 'button');
        cardEl.setAttribute('tabindex', '0');
        cardEl.setAttribute('title', 'Double-cliquez pour interagir');

        const dispatch = () => {
          container.dispatchEvent(
            new CustomEvent('widget:interact', {
              detail: { action: 'cardclick', payload: card },
              bubbles: true,
            }),
          );
        };

        addL(cardEl, 'dblclick', () => dispatch());
        addL(cardEl, 'keydown', (ev: Event) => {
          const ke = ev as KeyboardEvent;
          if (ke.key === 'Enter' || ke.key === ' ') {
            ke.preventDefault();
            dispatch();
          }
        });
      }

      if (card.image) {
        const img = createSafeImage({
          src: card.image,
          alt: card.title,
          className: 'w-full h-32 object-cover',
          hideOnError: true,
        });
        cardEl.appendChild(img);
      }

      const body = document.createElement('div');
      body.className = 'p-3';

      const titleEl = document.createElement('div');
      titleEl.className = 'font-semibold text-sm text-text1 leading-tight';
      titleEl.textContent = card.title;
      body.appendChild(titleEl);

      if (card.subtitle) {
        const sub = document.createElement('div');
        sub.className = 'text-xs text-text2 mt-0.5';
        sub.textContent = card.subtitle;
        body.appendChild(sub);
      }

      if (card.description) {
        const desc = document.createElement('div');
        desc.className = 'text-xs text-text2 mt-1.5 leading-relaxed';
        desc.textContent = card.description;
        body.appendChild(desc);
      }

      if (Array.isArray(card.tags) && card.tags.length) {
        const tagsWrap = document.createElement('div');
        tagsWrap.className = 'flex gap-1 flex-wrap mt-2';
        for (const tag of card.tags) {
          const span = document.createElement('span');
          span.className = 'text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface2 text-text2';
          span.textContent = String(tag);
          tagsWrap.appendChild(span);
        }
        body.appendChild(tagsWrap);
      }

      cardEl.appendChild(body);
      grid.appendChild(cardEl);
    }

    root.appendChild(grid);
  }

  container.appendChild(root);

  return () => {
    for (const { el, type, handler } of listeners) {
      el.removeEventListener(type, handler);
    }
    listeners.length = 0;
    container.innerHTML = '';
  };
}

// Silence unused warning on some toolchains
void escapeHtml;
