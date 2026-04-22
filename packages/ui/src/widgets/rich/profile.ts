import { createSafeImage } from '../helpers/safe-image.js';

export interface ProfileField {
  label: string;
  value: string;
  href?: string;
}

export interface ProfileStat {
  label: string;
  value: string;
}

export interface ProfileAction {
  label: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  /** Identifier forwarded in `widget:interact` detail.payload when clicked. */
  id?: string;
  action?: string;
}

export interface ProfileSpec {
  name?: string;
  subtitle?: string;
  avatar?: { src: string; alt?: string };
  badge?: { text: string; variant?: 'default' | 'success' | 'warning' | 'error' };
  fields?: ProfileField[];
  stats?: ProfileStat[];
  actions?: ProfileAction[];
}

const BADGE: Record<string, string> = {
  default: 'bg-surface2 text-text2',
  success: 'bg-teal/20 text-teal',
  warning: 'bg-amber/20 text-amber',
  error: 'bg-accent2/20 text-accent2',
};

const ACTION: Record<string, string> = {
  primary: 'bg-accent text-white',
  secondary: 'bg-surface2 text-text2',
  danger: 'bg-accent2 text-white',
};

function computeInitials(name: string | undefined): string {
  const src = (name ?? '?').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/).slice(0, 2);
  const out = parts.map((w) => w[0] ?? '').join('').toUpperCase();
  return out || '?';
}

/**
 * Vanilla renderer for the "profile" / ProfileCard widget.
 *
 * Mounts a profile card (avatar, name/subtitle/badge, fields, stats, actions)
 * into `container`. Returns a cleanup function that removes listeners and
 * empties the container.
 *
 * Contract:
 *  - Pure imperative DOM.
 *  - Emits CustomEvent('widget:interact', { detail: { action, payload }, bubbles: true })
 *    when a button action is clicked (the Svelte version invoked `a.onclick()`
 *    locally; here we both bubble an event AND call `onclick` if provided).
 *  - Tailwind classes and CSS vars preserved verbatim.
 *  - Avatar fallback: a dedicated initials bubble is rendered when the src is
 *    missing/invalid. For valid URLs, createSafeImage adds an error listener
 *    that self-replaces with a placeholder — we additionally swap to an
 *    initials bubble on load error to match the original behaviour.
 */
export function render(container: HTMLElement, data: any): () => void {
  const spec: Partial<ProfileSpec> = (data && typeof data === 'object') ? data : {};
  const cleanups: Array<() => void> = [];

  const root = document.createElement('div');
  root.className = 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans max-w-full md:max-w-[480px]';

  // --- Header (avatar + name/subtitle/badge) ---
  const header = document.createElement('div');
  header.className = 'flex flex-col sm:flex-row items-center sm:items-start mb-4 gap-3 sm:gap-4';

  const initials = computeInitials(spec.name);
  const avatarClasses = 'w-16 h-16 rounded-full object-cover border-2 border-border2 flex-shrink-0';
  const fallbackClasses = 'w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center text-xl font-bold flex-shrink-0';

  const buildInitialsFallback = (): HTMLElement => {
    const div = document.createElement('div');
    div.className = fallbackClasses;
    div.setAttribute('role', 'img');
    div.setAttribute('aria-label', spec.name ?? 'Avatar');
    div.textContent = initials;
    return div;
  };

  const avatarSrc = spec.avatar?.src;
  const avatarAlt = spec.avatar?.alt ?? spec.name ?? '';
  const VALID_PREFIXES = ['http://', 'https://', 'data:', '/'];
  const srcLooksValid =
    typeof avatarSrc === 'string' &&
    avatarSrc.length > 0 &&
    VALID_PREFIXES.some((p) => avatarSrc.startsWith(p));

  if (srcLooksValid) {
    // Use createSafeImage; also listen for its error to swap in initials fallback.
    const imgEl = createSafeImage({
      src: avatarSrc!,
      alt: avatarAlt,
      className: avatarClasses,
      fallbackText: initials,
    });
    header.appendChild(imgEl);

    // If it's a real <img>, on error we swap for initials (prefer over placeholder).
    if (imgEl.tagName === 'IMG') {
      const onErr = () => {
        const fb = buildInitialsFallback();
        imgEl.replaceWith(fb);
      };
      imgEl.addEventListener('error', onErr, { once: true });
      cleanups.push(() => imgEl.removeEventListener('error', onErr));
    }
  } else {
    header.appendChild(buildInitialsFallback());
  }

  // Text block (name, subtitle, badge)
  const textBlock = document.createElement('div');

  const nameEl = document.createElement('h3');
  nameEl.className = 'text-lg font-bold text-text1 m-0';
  nameEl.textContent = spec.name ?? '';
  textBlock.appendChild(nameEl);

  if (spec.subtitle) {
    const sub = document.createElement('div');
    sub.className = 'text-sm text-text2 mt-0.5';
    sub.textContent = spec.subtitle;
    textBlock.appendChild(sub);
  }

  if (spec.badge) {
    const badgeWrap = document.createElement('div');
    badgeWrap.className = 'mt-1';
    const span = document.createElement('span');
    const variantCls = BADGE[spec.badge.variant ?? 'default'] ?? BADGE.default;
    span.className = `text-xs font-semibold px-2 py-0.5 rounded-full ${variantCls}`;
    span.textContent = spec.badge.text;
    badgeWrap.appendChild(span);
    textBlock.appendChild(badgeWrap);
  }

  header.appendChild(textBlock);
  root.appendChild(header);

  // --- Fields ---
  if (Array.isArray(spec.fields) && spec.fields.length) {
    const dl = document.createElement('dl');
    dl.className = 'border-t border-border pt-3 m-0';
    for (const f of spec.fields) {
      const row = document.createElement('div');
      row.className = 'flex gap-2 mb-1.5';

      const dt = document.createElement('dt');
      dt.className = 'text-xs text-text2 min-w-[80px] sm:min-w-[100px] font-mono';
      dt.textContent = f.label;
      row.appendChild(dt);

      const dd = document.createElement('dd');
      dd.className = 'text-sm text-text1 m-0';
      if (f.href) {
        const a = document.createElement('a');
        a.href = f.href;
        a.className = 'text-accent hover:underline';
        a.textContent = f.value;
        dd.appendChild(a);
      } else {
        dd.textContent = f.value;
      }
      row.appendChild(dd);
      dl.appendChild(row);
    }
    root.appendChild(dl);
  }

  // --- Stats ---
  if (Array.isArray(spec.stats) && spec.stats.length) {
    const statsWrap = document.createElement('div');
    statsWrap.className = 'flex flex-wrap border border-border rounded overflow-hidden mt-3';
    for (const s of spec.stats) {
      const cell = document.createElement('div');
      cell.className = 'text-center px-4 py-2 border-r border-border last:border-r-0 flex-1 min-w-[80px]';
      const vEl = document.createElement('div');
      vEl.className = 'text-xl font-bold text-accent';
      vEl.textContent = s.value;
      const lEl = document.createElement('div');
      lEl.className = 'text-xs text-text2';
      lEl.textContent = s.label;
      cell.appendChild(vEl);
      cell.appendChild(lEl);
      statsWrap.appendChild(cell);
    }
    root.appendChild(statsWrap);
  }

  // --- Actions ---
  if (Array.isArray(spec.actions) && spec.actions.length) {
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'flex gap-2 mt-3 flex-wrap';

    spec.actions.forEach((a, idx) => {
      const variantCls = ACTION[a.variant ?? 'secondary'] ?? ACTION.secondary;
      if (a.href) {
        const link = document.createElement('a');
        link.href = a.href;
        link.className = `inline-flex items-center px-3.5 py-1.5 rounded text-xs font-semibold no-underline ${variantCls}`;
        link.textContent = a.label;
        actionsWrap.appendChild(link);
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `inline-flex items-center px-3.5 py-1.5 rounded text-xs font-semibold border-0 cursor-pointer ${variantCls}`;
        btn.textContent = a.label;
        const handler = (ev: MouseEvent) => {
          // Bubble a canonical widget:interact event.
          container.dispatchEvent(new CustomEvent('widget:interact', {
            detail: {
              action: a.action ?? a.id ?? a.label,
              payload: { index: idx, label: a.label },
            },
            bubbles: true,
          }));
          // Preserve original local onclick if provided.
          if (typeof (a as any).onclick === 'function') {
            try { (a as any).onclick(ev); } catch { /* swallow */ }
          }
        };
        btn.addEventListener('click', handler);
        cleanups.push(() => btn.removeEventListener('click', handler));
        actionsWrap.appendChild(btn);
      }
    });

    root.appendChild(actionsWrap);
  }

  container.appendChild(root);

  return () => {
    for (const fn of cleanups) {
      try { fn(); } catch { /* swallow */ }
    }
    cleanups.length = 0;
    container.innerHTML = '';
  };
}
