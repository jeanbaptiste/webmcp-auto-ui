<script lang="ts">
  /**
   * SafeImage — URL validation + error fallback. Replaces raw <img> in widgets.
   */
  interface Props {
    src: string | undefined | null;
    alt?: string;
    class?: string;
    style?: string;
    loading?: 'lazy' | 'eager';
    fallbackText?: string;
    hideOnError?: boolean;
  }

  let { src, alt = '', class: className = '', style = '', loading = 'lazy', fallbackText, hideOnError = false }: Props = $props();

  const VALID_PREFIXES = ['http://', 'https://', 'data:', '/'];

  const isValidUrl = $derived(
    typeof src === 'string' && src.length > 0 && VALID_PREFIXES.some(p => src!.startsWith(p))
  );

  let hasError = $state(false);
  let isLoaded = $state(false);

  $effect(() => {
    if (src) {
      hasError = false;
      isLoaded = false;
    }
  });

  function onError() { hasError = true; }
  function onLoad() { isLoaded = true; }

  const showPlaceholder = $derived(!isValidUrl || hasError);
  const label = $derived(fallbackText ?? alt ?? 'Image');
</script>

{#if showPlaceholder}
  {#if !hideOnError}
    <div
      class="flex items-center justify-center bg-surface2 text-text2 text-xs {className}"
      {style}
      role="img"
      aria-label={label}
    >
      <svg class="w-5 h-5 opacity-40 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <span class="truncate max-w-[80%]">{label}</span>
    </div>
  {/if}
{:else}
  <img
    {src}
    {alt}
    class={className}
    {style}
    {loading}
    onerror={onError}
    onload={onLoad}
    referrerpolicy="no-referrer"
  />
{/if}
