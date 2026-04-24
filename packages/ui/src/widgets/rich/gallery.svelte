<svelte:options customElement={{ tag: 'auto-gallery', shadow: 'none' }} />

<script lang="ts">
  import SafeImage from '../SafeImage.svelte';
  import Dialog from '../../base/dialog-root.svelte';
  import DialogTrigger from '../../base/dialog-trigger.svelte';
  import DialogContent from '../../base/dialog-content.svelte';

  export interface GalleryImage { src: string; alt?: string; caption?: string; href?: string; }
  export interface GalleryData {
    title?: string;
    images?: GalleryImage[];
    columns?: number;
    emptyMessage?: string;
  }

  interface Props { data?: GalleryData | null; }
  let { data = {} }: Props = $props();

  const images = $derived<GalleryImage[]>(
    Array.isArray(data?.images) && data!.images!.length ? data!.images! :
    []
  );

  let lightboxOpen = $state(false);
  let lightboxIdx = $state(0);
  const lightboxImg = $derived(images[lightboxIdx] ?? null);

  function open(i: number) { lightboxIdx = i; lightboxOpen = true; }
  function close() { lightboxOpen = false; }
  function prev() { if (lightboxIdx > 0) lightboxIdx--; }
  function next() { if (lightboxIdx < images.length - 1) lightboxIdx++; }

  function onKey(e: KeyboardEvent) {
    if (!lightboxOpen) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if data?.title}<h3 class="text-sm font-semibold text-text1 mb-3">{data.title}</h3>{/if}
  {#if images.length === 0}
    <p class="text-text2 text-sm">{data?.emptyMessage ?? 'Aucune image'}</p>
  {:else if images.length === 1}
    {@const img = images[0]}
    <Dialog bind:open={lightboxOpen}>
      <DialogTrigger class="relative overflow-hidden rounded-lg border border-border hover:border-border2 transition-all cursor-pointer bg-transparent p-0 group w-full text-left">
        <SafeImage src={img.src} alt={img.alt ?? ''} class="w-full max-h-[400px] object-contain rounded-lg" loading="eager" />
        {#if img.caption || img.alt}
          <div class="mt-2 text-center text-xs text-text2">{img.caption ?? img.alt}</div>
        {/if}
      </DialogTrigger>
      <DialogContent class="max-w-[90vw] max-h-[90vh] p-2 overflow-hidden">
        {#if lightboxImg}
          <SafeImage src={lightboxImg.src} alt={lightboxImg.alt ?? ''} class="max-w-full max-h-[85vh] object-contain rounded" />
          {#if lightboxImg.caption}
            <div class="text-center text-text2 text-sm mt-2">{lightboxImg.caption}</div>
          {/if}
        {/if}
      </DialogContent>
    </Dialog>
  {:else}
    <Dialog bind:open={lightboxOpen}>
      <div class="grid gap-2 responsive-gallery" style="--gallery-cols: repeat({data?.columns ?? 3}, minmax(0, 1fr));">
        {#each images as img, i}
          <DialogTrigger
            class="relative overflow-hidden rounded-lg border border-border hover:border-border2 transition-all cursor-pointer bg-transparent p-0 group text-left"
            onclick={() => (lightboxIdx = i)}
          >
            <SafeImage src={img.src} alt={img.alt ?? ''} class="w-full h-32 sm:h-40 object-cover transition-transform group-hover:scale-105" loading="lazy" />
            {#if img.caption}
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                <span class="text-white text-xs">{img.caption}</span>
              </div>
            {/if}
          </DialogTrigger>
        {/each}
      </div>
      <div class="mt-2 text-xs text-text2">{images.length} image{images.length !== 1 ? 's' : ''}</div>

      <DialogContent class="max-w-[90vw] max-h-[90vh] p-2 overflow-hidden">
        {#if lightboxImg}
          <div class="relative">
            <SafeImage src={lightboxImg.src} alt={lightboxImg.alt ?? ''} class="max-w-full max-h-[80vh] object-contain rounded" />
            {#if lightboxImg.caption}
              <div class="text-center text-text2 text-sm mt-2">{lightboxImg.caption}</div>
            {/if}
            {#if lightboxIdx > 0}
              <button
                class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                aria-label="Image précédente"
                onclick={prev}>&lsaquo;</button>
            {/if}
            {#if lightboxIdx < images.length - 1}
              <button
                class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                aria-label="Image suivante"
                onclick={next}>&rsaquo;</button>
            {/if}
          </div>
          <div class="text-center text-xs text-text2 mt-1">{lightboxIdx + 1} / {images.length}</div>
        {/if}
      </DialogContent>
    </Dialog>
  {/if}
</div>

<style>
  .responsive-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (min-width: 768px) { .responsive-gallery { grid-template-columns: var(--gallery-cols); } }
</style>
