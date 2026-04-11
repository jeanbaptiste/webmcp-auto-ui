<script lang="ts">
  import SafeImage from '../SafeImage.svelte';
  export interface GalleryImage { src: string; alt?: string; caption?: string; href?: string; }
  export interface GallerySpec { title?: string; images?: GalleryImage[]; columns?: number; gap?: string; emptyMessage?: string; }
  interface Props { spec: Partial<GallerySpec>; data?: unknown; onimageclick?: (img: GalleryImage, index: number) => void; }
  let { spec, data, onimageclick }: Props = $props();

  const images = $derived.by<GalleryImage[]>(() => {
    if (Array.isArray(spec.images) && spec.images.length) return spec.images;
    if (Array.isArray(data)) return (data as GalleryImage[]);
    return [];
  });

  let lightboxIdx = $state<number | null>(null);
  const lightboxImg = $derived(lightboxIdx !== null ? images[lightboxIdx] : null);

  function open(i: number) {
    lightboxIdx = i;
    onimageclick?.(images[i], i);
  }
  function close() { lightboxIdx = null; }
  function prev() { if (lightboxIdx !== null && lightboxIdx > 0) lightboxIdx--; }
  function next() { if (lightboxIdx !== null && lightboxIdx < images.length - 1) lightboxIdx++; }
  function onKey(e: KeyboardEvent) {
    if (lightboxIdx === null) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if spec.title}<h3 class="text-sm font-semibold text-text1 mb-3">{spec.title}</h3>{/if}
  {#if images.length === 0}
    <p class="text-text2 text-sm">{spec.emptyMessage ?? 'Aucune image'}</p>
  {:else}
    <div class="grid gap-2 responsive-gallery" style="--gallery-cols: repeat({spec.columns ?? 3}, minmax(0, 1fr));">
      {#each images as img, i}
        <button class="relative overflow-hidden rounded-lg border border-border hover:border-border2 transition-all cursor-pointer bg-transparent p-0 group"
          onclick={() => open(i)}>
          <SafeImage src={img.src} alt={img.alt ?? ''} class="w-full h-32 sm:h-40 object-cover transition-transform group-hover:scale-105" loading="lazy" />
          {#if img.caption}
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
              <span class="text-white text-xs">{img.caption}</span>
            </div>
          {/if}
        </button>
      {/each}
    </div>
    <div class="mt-2 text-xs text-text2">{images.length} image{images.length !== 1 ? 's' : ''}</div>
  {/if}

  {#if lightboxImg}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onclick={close}>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="relative max-w-[90vw] max-h-[90vh]" onclick={(e) => e.stopPropagation()}>
        <SafeImage src={lightboxImg.src} alt={lightboxImg.alt ?? ''} class="max-w-full max-h-[85vh] object-contain rounded" />
        {#if lightboxImg.caption}
          <div class="text-center text-white text-sm mt-2">{lightboxImg.caption}</div>
        {/if}
        <button class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-lg hover:bg-black/70" onclick={close}>&times;</button>
        {#if lightboxIdx !== null && lightboxIdx > 0}
          <button class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70" onclick={prev}>&lsaquo;</button>
        {/if}
        {#if lightboxIdx !== null && lightboxIdx < images.length - 1}
          <button class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70" onclick={next}>&rsaquo;</button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .responsive-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (min-width: 768px) { .responsive-gallery { grid-template-columns: var(--gallery-cols); } }
</style>
