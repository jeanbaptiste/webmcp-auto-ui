<script lang="ts">
  import { BlockRenderer, getTheme } from '@webmcp-auto-ui/ui';
  import { PRESETS, type ThemePreset } from '$lib/themes';
  import { SIMPLE_BLOCKS, RICH_BLOCKS } from '$lib/demo-data';
  import { onMount } from 'svelte';

  const theme = getTheme();

  let activePreset = $state<ThemePreset>(PRESETS[0]);

  function selectPreset(preset: ThemePreset) {
    activePreset = preset;
    theme.setMode(preset.mode);
    // Apply overrides via CSS custom properties
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      for (const [key, value] of Object.entries(preset.overrides)) {
        root.style.setProperty(`--${key}`, value as string);
      }
    }
  }

  onMount(() => {
    selectPreset(activePreset);
  });
</script>

<svelte:head>
  <title>WebMCP Auto-UI — Component Showcase</title>
</svelte:head>

<div class="min-h-screen pb-20">
  <!-- Header -->
  <header class="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-lg font-bold text-text1 font-mono tracking-tight">WebMCP Auto-UI</h1>
        <p class="text-xs text-text2 font-mono">Component Showcase — {activePreset.label}</p>
      </div>

      <!-- Theme Switcher -->
      <div class="flex items-center gap-1.5 bg-surface border border-border rounded-lg p-1">
        {#each PRESETS as preset}
          <button
            class="text-xs font-mono px-3 py-1.5 rounded-md transition-all
              {activePreset.id === preset.id
                ? 'bg-accent text-white shadow-sm'
                : 'text-text2 hover:text-text1 hover:bg-surface2'}"
            onclick={() => selectPreset(preset)}
          >
            {preset.label}
          </button>
        {/each}
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 py-8">
    <!-- Simple Blocks -->
    <section class="mb-12">
      <h2 class="text-sm font-mono text-text2 uppercase tracking-widest mb-6 border-b border-border pb-2">
        Simple Blocks
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {#each SIMPLE_BLOCKS as block}
          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            <div class="bg-surface2 px-3 py-1.5 border-b border-border">
              <span class="text-[10px] font-mono text-text2 uppercase tracking-widest">{block.label}</span>
              <code class="text-[10px] font-mono text-accent ml-2">type="{block.type}"</code>
            </div>
            <BlockRenderer type={block.type} data={block.data} />
          </div>
        {/each}
      </div>
    </section>

    <!-- Rich Blocks -->
    <section>
      <h2 class="text-sm font-mono text-text2 uppercase tracking-widest mb-6 border-b border-border pb-2">
        Rich Blocks
      </h2>
      <div class="flex flex-col gap-6">
        {#each RICH_BLOCKS as block}
          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            <div class="bg-surface2 px-3 py-1.5 border-b border-border flex items-center gap-2">
              <span class="text-[10px] font-mono text-text2 uppercase tracking-widest">{block.label}</span>
              <code class="text-[10px] font-mono text-accent">type="{block.type}"</code>
            </div>
            <div class="p-4">
              <BlockRenderer type={block.type} data={block.data} />
            </div>
          </div>
        {/each}
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="border-t border-border py-6 mt-12">
    <div class="max-w-7xl mx-auto px-4 text-center">
      <p class="text-xs font-mono text-text2">
        WebMCP Auto-UI — {SIMPLE_BLOCKS.length + RICH_BLOCKS.length} composants — 3 themes
      </p>
    </div>
  </footer>
</div>
