/**
 * Carousel (vanilla) — slides with prev/next buttons, dots, auto-advance and swipe.
 * Mirrors Carousel.svelte. Replaces $effect/setInterval with a closure-managed timer.
 *
 * Contract:
 *   render(container, data) -> cleanup()
 * Payload shape:
 *   { spec: Partial<CarouselSpec>, data?: unknown, onslidechange?: (slide, index) => void }
 * Event:
 *   'widget:interact' { action: 'slidechange', payload: { slide, index } }
 *
 * Cleanup: clears the auto-advance interval, removes all listeners and empties the container.
 */

import { createSafeImage } from '../helpers/safe-image.js';

export interface CarouselSlide {
  src?: string;
  content?: string;
  title?: string;
  subtitle?: string;
}

export interface CarouselSpec {
  title?: string;
  slides?: CarouselSlide[];
  autoPlay?: boolean;
  interval?: number;
}

interface CarouselPayload {
  spec?: Partial<CarouselSpec>;
  data?: unknown;
  onslidechange?: (slide: CarouselSlide, index: number) => void;
}

function resolveSlides(spec: Partial<CarouselSpec>, data: unknown): CarouselSlide[] {
  if (Array.isArray(spec.slides) && spec.slides.length) return spec.slides as CarouselSlide[];
  if (Array.isArray(data)) return data as CarouselSlide[];
  return [];
}

export function render(container: HTMLElement, data: any): () => void {
  const payload: CarouselPayload = (data && typeof data === 'object' ? data : {}) as CarouselPayload;
  const spec: Partial<CarouselSpec> = payload.spec ?? {};
  const inner = payload.data;
  const onslidechange = typeof payload.onslidechange === 'function' ? payload.onslidechange : undefined;
  const slides = resolveSlides(spec, inner);
  const autoPlay = spec.autoPlay !== false;
  const intervalMs = spec.interval ?? 5000;

  // --- Root ---
  const root = document.createElement('div');
  root.className = 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans';

  if (spec.title) {
    const h3 = document.createElement('h3');
    h3.className = 'text-sm font-semibold text-text1 mb-3';
    h3.textContent = spec.title;
    root.appendChild(h3);
  }

  // --- Tracked listeners for robust cleanup ---
  const listeners: Array<{ el: EventTarget; type: string; handler: EventListener; opts?: AddEventListenerOptions }> = [];
  const addL = (el: EventTarget, type: string, handler: EventListener, opts?: AddEventListenerOptions) => {
    el.addEventListener(type, handler, opts);
    listeners.push({ el, type, handler, opts });
  };

  // --- Auto-advance timer (closure-managed, replaces $effect) ---
  let timer: ReturnType<typeof setInterval> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  // Empty state — no slides, nothing else to wire
  if (slides.length === 0) {
    const p = document.createElement('p');
    p.className = 'text-text2 text-sm';
    p.textContent = 'Aucun contenu';
    root.appendChild(p);
    container.appendChild(root);
    return () => {
      container.innerHTML = '';
    };
  }

  // --- Current index via closure ---
  let currentIdx = 0;

  // --- Viewport ---
  const viewport = document.createElement('div');
  viewport.className = 'relative overflow-hidden rounded-lg';
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-roledescription', 'carousel');
  viewport.setAttribute('aria-label', spec.title ?? 'Carousel');
  viewport.setAttribute('tabindex', '0');

  // --- Track (flex row translated on change) ---
  const track = document.createElement('div');
  track.className = 'flex transition-transform duration-300 ease-out';
  track.style.transform = 'translateX(0%)';

  const slideEls: HTMLElement[] = [];
  slides.forEach((slide, i) => {
    const slideEl = document.createElement('div');
    slideEl.className = 'w-full flex-shrink-0';
    slideEl.setAttribute('role', 'group');
    slideEl.setAttribute('aria-roledescription', 'slide');
    slideEl.setAttribute('aria-label', `${i + 1} / ${slides.length}`);
    slideEl.setAttribute('aria-current', i === 0 ? 'true' : 'false');

    if (slide.src) {
      const img = createSafeImage({
        src: slide.src,
        alt: slide.title ?? '',
        className: 'w-full h-48 sm:h-64 object-cover',
        loading: 'lazy',
      });
      slideEl.appendChild(img);
    }

    if (slide.title || slide.subtitle || slide.content) {
      const body = document.createElement('div');
      body.className = 'p-3';

      if (slide.title) {
        const t = document.createElement('div');
        t.className = 'font-semibold text-sm text-text1';
        t.textContent = slide.title;
        body.appendChild(t);
      }
      if (slide.subtitle) {
        const s = document.createElement('div');
        s.className = 'text-xs text-text2 mt-0.5';
        s.textContent = slide.subtitle;
        body.appendChild(s);
      }
      if (slide.content) {
        const c = document.createElement('div');
        c.className = 'text-xs text-text2 mt-1.5';
        c.textContent = slide.content;
        body.appendChild(c);
      }

      slideEl.appendChild(body);
    }

    track.appendChild(slideEl);
    slideEls.push(slideEl);
  });

  viewport.appendChild(track);

  // --- Dots container (built up front, updated on change) ---
  const dots: HTMLButtonElement[] = [];
  let dotsWrap: HTMLDivElement | null = null;
  if (slides.length > 1) {
    dotsWrap = document.createElement('div');
    dotsWrap.className = 'flex justify-center gap-1.5 mt-2';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `w-2 h-2 rounded-full transition-colors ${i === 0 ? 'bg-accent' : 'bg-border2'}`;
      dot.setAttribute('aria-label', `Aller à la diapositive ${i + 1}`);
      dot.setAttribute('aria-current', i === 0 ? 'true' : 'false');
      dots.push(dot);
    });
  }

  // --- Render state (DOM updates) ---
  const renderState = () => {
    track.style.transform = `translateX(-${currentIdx * 100}%)`;
    slideEls.forEach((el, i) => {
      el.setAttribute('aria-current', i === currentIdx ? 'true' : 'false');
    });
    dots.forEach((dot, i) => {
      const active = i === currentIdx;
      dot.className = `w-2 h-2 rounded-full transition-colors ${active ? 'bg-accent' : 'bg-border2'}`;
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };

  // --- Navigation ---
  const resetAuto = () => {
    clearTimer();
    if (autoPlay && slides.length > 1) {
      timer = setInterval(() => {
        // internal tick — not user-initiated
        goTo(currentIdx < slides.length - 1 ? currentIdx + 1 : 0, false);
      }, intervalMs);
    }
  };

  const goTo = (i: number, userInitiated: boolean) => {
    const next = Math.max(0, Math.min(i, slides.length - 1));
    if (next === currentIdx && !userInitiated) {
      // still reset timer to avoid drift
      resetAuto();
      return;
    }
    currentIdx = next;
    renderState();
    if (userInitiated) {
      const slide = slides[currentIdx];
      onslidechange?.(slide, currentIdx);
      container.dispatchEvent(
        new CustomEvent('widget:interact', {
          detail: { action: 'slidechange', payload: { slide, index: currentIdx } },
          bubbles: true,
        }),
      );
    }
    resetAuto();
  };

  const prev = (userInitiated: boolean) => {
    goTo(currentIdx > 0 ? currentIdx - 1 : slides.length - 1, userInitiated);
  };
  const next = (userInitiated: boolean) => {
    goTo(currentIdx < slides.length - 1 ? currentIdx + 1 : 0, userInitiated);
  };

  // --- Prev/Next buttons ---
  if (slides.length > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className =
      'absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 text-sm';
    prevBtn.setAttribute('aria-label', 'Diapositive précédente');
    prevBtn.innerHTML = '&lsaquo;';
    addL(prevBtn, 'click', () => prev(true));

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className =
      'absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 text-sm';
    nextBtn.setAttribute('aria-label', 'Diapositive suivante');
    nextBtn.innerHTML = '&rsaquo;';
    addL(nextBtn, 'click', () => next(true));

    viewport.appendChild(prevBtn);
    viewport.appendChild(nextBtn);
  }

  // --- Touch/swipe ---
  let touchStartX = 0;
  addL(
    viewport,
    'touchstart',
    (e) => {
      const te = e as TouchEvent;
      touchStartX = te.touches[0]?.clientX ?? 0;
    },
    { passive: true },
  );
  addL(
    viewport,
    'touchend',
    (e) => {
      const te = e as TouchEvent;
      const endX = te.changedTouches[0]?.clientX ?? 0;
      const diff = touchStartX - endX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) next(true);
        else prev(true);
      }
    },
    { passive: true },
  );

  // --- Keyboard arrows ---
  addL(viewport, 'keydown', (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'ArrowLeft') {
      ke.preventDefault();
      prev(true);
    } else if (ke.key === 'ArrowRight') {
      ke.preventDefault();
      next(true);
    }
  });

  // --- Pause auto-advance on hover / focus for accessibility ---
  addL(viewport, 'mouseenter', () => clearTimer());
  addL(viewport, 'mouseleave', () => resetAuto());
  addL(viewport, 'focusin', () => clearTimer());
  addL(viewport, 'focusout', () => resetAuto());

  // --- Wire dots ---
  if (dotsWrap) {
    dots.forEach((dot, i) => {
      addL(dot, 'click', () => goTo(i, true));
      dotsWrap!.appendChild(dot);
    });
  }

  // --- Mount ---
  root.appendChild(viewport);
  if (dotsWrap) root.appendChild(dotsWrap);
  container.appendChild(root);

  // --- Start auto-advance ---
  resetAuto();

  // --- Cleanup ---
  return () => {
    clearTimer();
    for (const { el, type, handler, opts } of listeners) {
      el.removeEventListener(type, handler, opts);
    }
    listeners.length = 0;
    container.innerHTML = '';
  };
}
