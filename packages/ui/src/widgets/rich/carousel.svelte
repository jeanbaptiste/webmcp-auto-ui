<svelte:options customElement={{ tag: 'auto-carousel', shadow: 'none' }} />

<script lang="ts">
  import SafeImage from '../SafeImage.svelte';

  export interface CarouselSlide { src?: string; content?: string; title?: string; subtitle?: string; }
  export interface CarouselData {
    title?: string;
    slides?: CarouselSlide[];
    autoPlay?: boolean;
    interval?: number;
  }

  interface Props { data?: CarouselData | null; }
  let { data = {} }: Props = $props();

  const slides = $derived<CarouselSlide[]>(
    Array.isArray(data?.slides) && data!.slides!.length ? data!.slides! : []
  );

  let current = $state(0);
  let paused = $state(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  function goTo(i: number) {
    current = Math.max(0, Math.min(i, slides.length - 1));
    resetAuto();
  }
  function prev() { goTo(current > 0 ? current - 1 : slides.length - 1); }
  function next() { goTo(current < slides.length - 1 ? current + 1 : 0); }

  function resetAuto() {
    if (timer) clearInterval(timer);
    if (data?.autoPlay !== false && slides.length > 1 && !paused) {
      timer = setInterval(next, data?.interval ?? 5000);
    }
  }

  $effect(() => {
    if (data?.autoPlay !== false && slides.length > 1) {
      resetAuto();
      return () => { if (timer) clearInterval(timer); };
    }
  });

  function onPauseStart() { paused = true; if (timer) { clearInterval(timer); timer = null; } }
  function onPauseEnd() { paused = false; resetAuto(); }

  // Touch/swipe support
  let touchStartX = 0;
  function onTouchStart(e: TouchEvent) { touchStartX = e.touches[0].clientX; }
  function onTouchEnd(e: TouchEvent) {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
  }
</script>

<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if data?.title}<h3 class="text-sm font-semibold text-text1 mb-3">{data.title}</h3>{/if}
  {#if slides.length === 0}
    <p class="text-text2 text-sm">Aucun contenu</p>
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="relative overflow-hidden rounded-lg"
      aria-roledescription="carousel"
      aria-label={data?.title ?? 'Carousel'}
      ontouchstart={onTouchStart}
      ontouchend={onTouchEnd}
      onmouseenter={onPauseStart}
      onmouseleave={onPauseEnd}
      onfocusin={onPauseStart}
      onfocusout={onPauseEnd}
    >
      <div class="flex transition-transform duration-300 ease-out" style="transform: translateX(-{current * 100}%);">
        {#each slides as slide, i}
          <div
            class="w-full flex-shrink-0"
            role="group"
            aria-roledescription="slide"
            aria-label="{i + 1} sur {slides.length}{slide.title ? ': ' + slide.title : ''}"
            aria-hidden={i !== current ? true : undefined}
          >
            {#if slide.src}
              <SafeImage src={slide.src} alt={slide.title ?? ''} class="w-full h-48 sm:h-64 object-cover" loading="lazy" />
            {/if}
            {#if slide.title || slide.subtitle || slide.content}
              <div class="p-3">
                {#if slide.title}<div class="font-semibold text-sm text-text1">{slide.title}</div>{/if}
                {#if slide.subtitle}<div class="text-xs text-text2 mt-0.5">{slide.subtitle}</div>{/if}
                {#if slide.content}<div class="text-xs text-text2 mt-1.5">{slide.content}</div>{/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      {#if slides.length > 1}
        <button
          class="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 text-sm"
          aria-label="Slide précédente"
          onclick={prev}
        >&lsaquo;</button>
        <button
          class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 text-sm"
          aria-label="Slide suivante"
          onclick={next}
        >&rsaquo;</button>
      {/if}
    </div>

    {#if slides.length > 1}
      <div class="flex justify-center gap-1.5 mt-2" role="tablist" aria-label="Slides">
        {#each slides as _, i}
          <button
            class="w-2 h-2 rounded-full transition-colors {i === current ? 'bg-accent' : 'bg-border2'}"
            role="tab"
            aria-selected={i === current}
            aria-label="Slide {i + 1}"
            onclick={() => goTo(i)}
          ></button>
        {/each}
      </div>
    {/if}
  {/if}
</div>
