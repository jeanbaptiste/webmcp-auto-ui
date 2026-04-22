/**
 * SafeImage (vanilla) — URL validation, error fallback, placeholder rendering.
 * Replaces SafeImage.svelte. Used by Profile/Cards/Carousel/Gallery/Trombinoscope renderers.
 */

export interface SafeImageOptions {
  src: string | undefined | null;
  alt?: string;
  className?: string;
  style?: string;
  loading?: 'lazy' | 'eager';
  fallbackText?: string;
  hideOnError?: boolean;
}

const VALID_PREFIXES = ['http://', 'https://', 'data:', '/'];

function isValidSrc(src: unknown): src is string {
  return typeof src === 'string' && src.length > 0 && VALID_PREFIXES.some((p) => (src as string).startsWith(p));
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function buildPlaceholder(label: string, opts: SafeImageOptions): HTMLElement {
  const div = document.createElement('div');
  div.className = `flex items-center justify-center bg-surface2 text-text2 text-xs ${opts.className ?? ''}`.trim();
  if (opts.style) div.setAttribute('style', opts.style);
  div.setAttribute('role', 'img');
  div.setAttribute('aria-label', label);
  div.innerHTML =
    '<svg class="w-5 h-5 opacity-40 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
    '<circle cx="8.5" cy="8.5" r="1.5"/>' +
    '<path d="M21 15l-5-5L5 21"/></svg>' +
    `<span class="truncate max-w-[80%]">${escapeHtml(label)}</span>`;
  return div;
}

function buildHidden(): HTMLElement {
  const el = document.createElement('div');
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');
  return el;
}

/**
 * Returns an HTMLElement for the given image source.
 * - Invalid/missing URL → placeholder (or hidden element if hideOnError).
 * - Valid URL → <img> that self-replaces with placeholder on load error.
 */
export function createSafeImage(opts: SafeImageOptions): HTMLElement {
  const label = opts.fallbackText ?? opts.alt ?? 'Image';

  if (!isValidSrc(opts.src)) {
    return opts.hideOnError ? buildHidden() : buildPlaceholder(label, opts);
  }

  const img = document.createElement('img');
  img.src = opts.src;
  img.alt = opts.alt ?? '';
  if (opts.className) img.className = opts.className;
  if (opts.style) img.setAttribute('style', opts.style);
  img.loading = opts.loading ?? 'lazy';
  img.referrerPolicy = 'no-referrer';

  img.addEventListener(
    'error',
    () => {
      const replacement = opts.hideOnError ? buildHidden() : buildPlaceholder(label, opts);
      img.replaceWith(replacement);
    },
    { once: true },
  );

  return img;
}
