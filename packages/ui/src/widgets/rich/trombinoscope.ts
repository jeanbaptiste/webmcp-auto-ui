import { createSafeImage } from '../helpers/safe-image.js';

export interface TrombinoscopePerson {
  name: string;
  subtitle?: string;
  avatar?: string;
  badge?: string;
  color?: string;
  badgeColor?: string;
}

export interface TrombinoscopeSpec {
  title?: string;
  people?: TrombinoscopePerson[];
  columns?: number;
  showBadge?: boolean;
}

const COLORS = [
  '#7c6dfa',
  '#3ecfb2',
  '#f0a050',
  '#fa6d7c',
  '#3b82f6',
  '#a855f7',
  '#14b8a6',
  '#f97316',
];

function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length]!;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  );
}

function extractPeople(input: any): TrombinoscopePerson[] {
  if (input && typeof input === 'object' && Array.isArray(input.people) && input.people.length) {
    return input.people as TrombinoscopePerson[];
  }
  if (Array.isArray(input)) return input as TrombinoscopePerson[];
  if (input && typeof input === 'object' && Array.isArray((input as any).data)) {
    return (input as any).data as TrombinoscopePerson[];
  }
  return [];
}

/**
 * Vanilla renderer for the "trombinoscope" widget.
 *
 * Contract:
 *  - render(container, data): () => void
 *  - `data` is the spec (may include `people`); if `data` is itself an array
 *    of persons, that is used as the roster.
 *  - Emits CustomEvent('widget:interact', {
 *      detail: { action: 'personclick', payload: person }, bubbles: true })
 *    when a person card is clicked.
 *  - Cleanup removes all listeners and empties the container.
 *  - Avatar fallback: createSafeImage handles URL validation + error fallback;
 *    we additionally render an "initials bubble" when the URL is invalid/missing
 *    and swap the <img> for an initials bubble on load error (closer to the
 *    original Svelte behaviour than a generic placeholder).
 */
export function render(container: HTMLElement, data: any): () => void {
  const spec: Partial<TrombinoscopeSpec> =
    data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const people = extractPeople(data);
  const cols = spec.columns ?? 4;
  const showBadge = spec.showBadge !== false;
  const hasClickHandler = true; // vanilla renderer always bubbles clicks

  const cleanups: Array<() => void> = [];

  const root = document.createElement('div');
  root.className = 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans';

  if (spec.title) {
    const h = document.createElement('h3');
    h.className = 'text-sm font-semibold text-text1 mb-3';
    h.textContent = spec.title;
    root.appendChild(h);
  }

  if (people.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-text2 text-sm';
    empty.textContent = 'Aucune personne';
    root.appendChild(empty);
    container.appendChild(root);
    return () => {
      container.innerHTML = '';
    };
  }

  const grid = document.createElement('div');
  grid.className = 'grid gap-3 responsive-trombi';
  grid.setAttribute('style', `--trombi-cols: repeat(${cols}, minmax(0, 1fr));`);

  for (const person of people) {
    const accent = person.color ?? nameColor(person.name);

    const card = document.createElement('div');
    card.className =
      'flex flex-col items-center text-center p-3 rounded-lg border border-border hover:border-border2 transition-all' +
      (hasClickHandler ? ' cursor-pointer' : '');
    if (hasClickHandler) {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
    }

    // Avatar
    const avatarClasses = 'w-12 h-12 rounded-full object-cover mb-2 border-2';
    const fallbackClasses =
      'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base mb-2 flex-shrink-0';

    const buildInitialsFallback = (): HTMLElement => {
      const div = document.createElement('div');
      div.className = fallbackClasses;
      div.setAttribute('style', `background:${accent};`);
      div.setAttribute('role', 'img');
      div.setAttribute('aria-label', person.name);
      div.textContent = initials(person.name);
      return div;
    };

    const VALID_PREFIXES = ['http://', 'https://', 'data:', '/'];
    const srcLooksValid =
      typeof person.avatar === 'string' &&
      person.avatar.length > 0 &&
      VALID_PREFIXES.some((p) => person.avatar!.startsWith(p));

    if (srcLooksValid) {
      const imgEl = createSafeImage({
        src: person.avatar!,
        alt: person.name,
        className: avatarClasses,
        style: `border-color:${accent};`,
        fallbackText: initials(person.name),
      });
      card.appendChild(imgEl);

      if (imgEl.tagName === 'IMG') {
        const onErr = () => {
          const fb = buildInitialsFallback();
          imgEl.replaceWith(fb);
        };
        imgEl.addEventListener('error', onErr, { once: true });
        cleanups.push(() => imgEl.removeEventListener('error', onErr));
      }
    } else {
      card.appendChild(buildInitialsFallback());
    }

    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'text-xs font-semibold text-text1 leading-tight truncate w-full';
    nameEl.textContent = person.name;
    card.appendChild(nameEl);

    // Subtitle
    if (person.subtitle) {
      const sub = document.createElement('div');
      sub.className = 'text-xs text-text2 mt-0.5 truncate w-full';
      sub.textContent = person.subtitle;
      card.appendChild(sub);
    }

    // Badge
    if (showBadge && person.badge) {
      const badge = document.createElement('span');
      badge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full mt-1.5 text-white';
      badge.setAttribute('style', `background:${person.badgeColor ?? accent};`);
      badge.textContent = person.badge;
      card.appendChild(badge);
    }

    // Click / keyboard handlers
    const emitClick = () => {
      container.dispatchEvent(
        new CustomEvent('widget:interact', {
          detail: { action: 'personclick', payload: person },
          bubbles: true,
        }),
      );
    };
    const onClick = (e: Event) => {
      emitClick();
      e.stopPropagation();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        emitClick();
      }
    };
    card.addEventListener('click', onClick);
    card.addEventListener('keydown', onKey);
    cleanups.push(() => card.removeEventListener('click', onClick));
    cleanups.push(() => card.removeEventListener('keydown', onKey));

    grid.appendChild(card);
  }

  root.appendChild(grid);

  const count = document.createElement('div');
  count.className = 'mt-3 text-xs text-text2';
  count.textContent = `${people.length} personne${people.length !== 1 ? 's' : ''}`;
  root.appendChild(count);

  // Inject scoped responsive grid styles (preserves original <style> block).
  // Only injected once per document to avoid duplication across instances.
  const STYLE_ID = 'wmcp-trombi-style';
  if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.responsive-trombi { grid-template-columns: repeat(2, minmax(0, 1fr)); }' +
      '@media (min-width: 768px) { .responsive-trombi { grid-template-columns: var(--trombi-cols); } }';
    document.head.appendChild(style);
  }

  container.appendChild(root);

  return () => {
    for (const fn of cleanups) {
      try {
        fn();
      } catch {
        /* swallow */
      }
    }
    cleanups.length = 0;
    container.innerHTML = '';
  };
}
