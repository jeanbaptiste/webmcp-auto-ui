/**
 * Gallery (vanilla) — grid of images with lightbox modal, prev/next nav, ESC to close.
 * Mirrors Gallery.svelte behavior (open on click, dblclick to dispatch imageclick,
 * keyboard nav in lightbox). Uses createSafeImage for URL validation + error fallback.
 */

import { createSafeImage } from '../helpers/safe-image.js';

export interface GalleryImage {
  src: string;
  alt?: string;
  caption?: string;
  href?: string;
}

export interface GallerySpec {
  title?: string;
  images?: GalleryImage[];
  columns?: number;
  gap?: string;
  emptyMessage?: string;
}

interface GalleryData {
  spec?: Partial<GallerySpec>;
  data?: unknown;
  // Back-compat: allow passing a bare array or bare spec.
  [k: string]: unknown;
}

function resolveImages(spec: Partial<GallerySpec>, data: unknown): GalleryImage[] {
  if (Array.isArray(spec.images) && spec.images.length) return spec.images;
  if (Array.isArray(data)) return data as GalleryImage[];
  return [];
}

function resolveSpec(input: unknown): { spec: Partial<GallerySpec>; data: unknown } {
  if (!input || typeof input !== 'object') return { spec: {}, data: undefined };
  const obj = input as GalleryData;
  // If object has spec/data shape, use it.
  if ('spec' in obj || 'data' in obj) {
    return { spec: (obj.spec as Partial<GallerySpec>) ?? {}, data: obj.data };
  }
  // If it's a bare array, treat as data.
  if (Array.isArray(input)) return { spec: {}, data: input };
  // Else treat the object itself as the spec.
  return { spec: obj as Partial<GallerySpec>, data: undefined };
}

function dispatchInteract(container: HTMLElement, image: GalleryImage, index: number): void {
  container.dispatchEvent(
    new CustomEvent('widget:interact', {
      detail: { action: 'imageclick', payload: { image, index } },
      bubbles: true,
    }),
  );
}

export function render(container: HTMLElement, data: any): () => void {
  const { spec, data: rawData } = resolveSpec(data);
  const images = resolveImages(spec, rawData);

  // --- Cleanup bookkeeping -------------------------------------------------
  const cleanups: Array<() => void> = [];
  let lightboxEl: HTMLElement | null = null;
  let lightboxIdx: number | null = null;
  let previouslyFocused: HTMLElement | null = null;

  // Root
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans';
  container.appendChild(root);

  // Title
  if (spec.title) {
    const h = document.createElement('h3');
    h.className = 'text-sm font-semibold text-text1 mb-3';
    h.textContent = spec.title;
    root.appendChild(h);
  }

  // --- Lightbox ------------------------------------------------------------
  function closeLightbox(): void {
    if (!lightboxEl) return;
    lightboxEl.remove();
    lightboxEl = null;
    lightboxIdx = null;
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      try {
        previouslyFocused.focus();
      } catch {
        /* no-op */
      }
    }
    previouslyFocused = null;
  }

  function renderLightboxContent(): void {
    if (!lightboxEl || lightboxIdx === null) return;
    const img = images[lightboxIdx];
    if (!img) return;

    const inner = lightboxEl.querySelector('[data-lightbox-inner]') as HTMLElement | null;
    if (!inner) return;
    inner.innerHTML = '';

    const safe = createSafeImage({
      src: img.src,
      alt: img.alt ?? '',
      className: 'max-w-full max-h-[85vh] object-contain rounded',
      loading: 'eager',
    });
    inner.appendChild(safe);

    if (img.caption) {
      const cap = document.createElement('div');
      cap.className = 'text-center text-white text-sm mt-2';
      cap.textContent = img.caption;
      inner.appendChild(cap);
    }

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.className =
      'absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-lg hover:bg-black/70';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLightbox();
    });
    inner.appendChild(closeBtn);

    // Prev
    if (lightboxIdx > 0) {
      const prev = document.createElement('button');
      prev.type = 'button';
      prev.setAttribute('aria-label', 'Image précédente');
      prev.className =
        'absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70';
      prev.innerHTML = '&lsaquo;';
      prev.addEventListener('click', (e) => {
        e.stopPropagation();
        goPrev();
      });
      inner.appendChild(prev);
    }

    // Next
    if (lightboxIdx < images.length - 1) {
      const next = document.createElement('button');
      next.type = 'button';
      next.setAttribute('aria-label', 'Image suivante');
      next.className =
        'absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70';
      next.innerHTML = '&rsaquo;';
      next.addEventListener('click', (e) => {
        e.stopPropagation();
        goNext();
      });
      inner.appendChild(next);
    }

    // Focus close for a11y
    try {
      closeBtn.focus();
    } catch {
      /* no-op */
    }
  }

  function goPrev(): void {
    if (lightboxIdx !== null && lightboxIdx > 0) {
      lightboxIdx--;
      renderLightboxContent();
    }
  }
  function goNext(): void {
    if (lightboxIdx !== null && lightboxIdx < images.length - 1) {
      lightboxIdx++;
      renderLightboxContent();
    }
  }

  function openLightbox(i: number): void {
    if (i < 0 || i >= images.length) return;
    if (lightboxEl) closeLightbox();
    previouslyFocused = (document.activeElement as HTMLElement) ?? null;
    lightboxIdx = i;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 bg-black/80 flex items-center justify-center';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image en grand');
    overlay.addEventListener('click', closeLightbox);

    const inner = document.createElement('div');
    inner.className = 'relative max-w-[90vw] max-h-[90vh]';
    inner.setAttribute('data-lightbox-inner', '');
    inner.addEventListener('click', (e) => e.stopPropagation());

    overlay.appendChild(inner);
    document.body.appendChild(overlay);
    lightboxEl = overlay;

    renderLightboxContent();
  }

  // Global keydown — ESC / arrows when lightbox open.
  function onKey(e: KeyboardEvent): void {
    if (lightboxIdx === null) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    } else if (e.key === 'Tab') {
      // Simple focus trap: keep focus inside the lightbox overlay.
      if (!lightboxEl) return;
      const focusables = lightboxEl.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  window.addEventListener('keydown', onKey);
  cleanups.push(() => window.removeEventListener('keydown', onKey));

  // --- Body ----------------------------------------------------------------
  if (images.length === 0) {
    const p = document.createElement('p');
    p.className = 'text-text2 text-sm';
    p.textContent = spec.emptyMessage ?? 'Aucune image';
    root.appendChild(p);
  } else if (images.length === 1) {
    const img = images[0];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'relative overflow-hidden rounded-lg border border-border hover:border-border2 transition-all cursor-pointer bg-transparent p-0 group w-full';
    btn.addEventListener('click', () => openLightbox(0));
    btn.addEventListener('dblclick', () => dispatchInteract(container, img, 0));

    const safe = createSafeImage({
      src: img.src,
      alt: img.alt ?? '',
      className: 'w-full max-h-[400px] object-contain rounded-lg',
      loading: 'eager',
    });
    btn.appendChild(safe);

    if (img.caption || img.alt) {
      const cap = document.createElement('div');
      cap.className = 'mt-2 text-center text-xs text-text2';
      cap.textContent = img.caption ?? img.alt ?? '';
      btn.appendChild(cap);
    }
    root.appendChild(btn);
  } else {
    const cols = spec.columns ?? 3;
    const grid = document.createElement('div');
    grid.className = 'grid gap-2 responsive-gallery';
    grid.setAttribute('role', 'list');
    grid.setAttribute('style', `--gallery-cols: repeat(${cols}, minmax(0, 1fr));`);
    // Inline the responsive rule as a <style> scope is awkward in vanilla;
    // we rely on the .responsive-gallery global rule from the Svelte version
    // being present, but also set a sensible default inline for robustness.
    // Fallback default (mobile): 2 columns.
    // The matching CSS (below) ensures desktop uses --gallery-cols.
    grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';

    images.forEach((img, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'listitem');
      btn.className =
        'relative overflow-hidden rounded-lg border border-border hover:border-border2 transition-all cursor-pointer bg-transparent p-0 group';
      btn.title = 'Double-cliquez pour interagir';
      btn.addEventListener('click', () => openLightbox(i));
      btn.addEventListener('dblclick', () => dispatchInteract(container, img, i));

      const safe = createSafeImage({
        src: img.src,
        alt: img.alt ?? '',
        className: 'w-full h-32 sm:h-40 object-cover transition-transform group-hover:scale-105',
        loading: 'lazy',
      });
      btn.appendChild(safe);

      if (img.caption) {
        const overlay = document.createElement('div');
        overlay.className =
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5';
        const span = document.createElement('span');
        span.className = 'text-white text-xs';
        span.textContent = img.caption;
        overlay.appendChild(span);
        btn.appendChild(overlay);
      }

      grid.appendChild(btn);
    });
    root.appendChild(grid);

    // Media query for desktop columns: inject once per render (scoped via data-attr).
    const styleId = 'autoui-gallery-responsive-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent =
        '@media (min-width: 768px){.responsive-gallery{grid-template-columns: var(--gallery-cols) !important;}}';
      document.head.appendChild(style);
    }

    const count = document.createElement('div');
    count.className = 'mt-2 text-xs text-text2';
    count.textContent = `${images.length} image${images.length !== 1 ? 's' : ''}`;
    root.appendChild(count);
  }

  // --- Cleanup -------------------------------------------------------------
  return () => {
    closeLightbox();
    for (const fn of cleanups) {
      try {
        fn();
      } catch {
        /* no-op */
      }
    }
    container.innerHTML = '';
  };
}
