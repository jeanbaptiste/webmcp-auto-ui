<script lang="ts">
  import { untrack } from 'svelte';

  interface Props {
    systemPrompt?: string;
    effectivePrompt?: string;
    maxTokens?: number;
    maxContextTokens?: number;
    maxTools?: number;
    cacheEnabled?: boolean;
    temperature?: number;
    topK?: number;
    modelType?: 'remote' | 'wasm';
    modelId?: string;
    class?: string;
  }

  let {
    systemPrompt = $bindable(''),
    effectivePrompt = '',
    maxTokens = $bindable(4096),
    maxContextTokens = $bindable(150_000),
    maxTools = $bindable(8),
    cacheEnabled = $bindable(true),
    temperature = $bindable(0.7),
    topK = $bindable(10),
    modelType = 'remote',
    modelId = '',
    class: cls = '',
  }: Props = $props();

  /** When true, the user is editing a custom prompt; when false, show effectivePrompt readonly */
  let customMode = $state(false);

  let promptSaved = $state(false);
  let savedTimer: ReturnType<typeof setTimeout> | null = null;

  /** Is the effective prompt available and different from the raw systemPrompt? */
  const hasEffective = $derived(!!effectivePrompt && effectivePrompt !== systemPrompt);

  /** The text shown in the textarea */
  const displayedPrompt = $derived(
    customMode || !hasEffective ? systemPrompt : effectivePrompt
  );

  /** Textarea is readonly when showing auto-generated prompt */
  const isReadonly = $derived(hasEffective && !customMode);

  function enterCustomMode() {
    customMode = true;
  }

  function resetToAuto() {
    customMode = false;
  }

  $effect(() => {
    systemPrompt; // track changes
    untrack(() => {
      if (savedTimer) clearTimeout(savedTimer);
      promptSaved = true;
      savedTimer = setTimeout(() => { promptSaved = false; }, 2000);
    });
  });

  // Dynamic ranges based on model type
  const ranges = $derived({
    maxTokens: { min: 256, max: 8192, step: 256 },
    maxContextTokens: modelType === 'wasm'
      ? { min: 1024, max: 131072, step: 1024 }
      : { min: 10_000, max: 200_000, step: 10_000 },
    temperature: { min: 0, max: 2, step: 0.1 },
    topK: { min: 1, max: 100, step: 1 },
  });

  // Clamp maxContextTokens when switching model type
  $effect(() => {
    const r = ranges.maxContextTokens;
    if (maxContextTokens < r.min) maxContextTokens = r.min;
    if (maxContextTokens > r.max) maxContextTokens = r.max;
  });

  function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return String(n);
  }
</script>

<div class="flex flex-col gap-4 {cls}">
  <!-- System prompt -->
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <label class="text-[9px] font-mono text-text2 uppercase tracking-wider">System Prompt</label>
      <div class="flex items-center gap-2">
        {#if promptSaved && customMode}
          <span class="text-[9px] font-mono text-teal transition-opacity">✓ applique</span>
        {/if}
        {#if hasEffective}
          {#if customMode}
            <button class="text-[9px] font-mono text-accent2 hover:text-accent transition-colors"
                    onclick={resetToAuto}>reinitialiser</button>
          {:else}
            <button class="text-[9px] font-mono text-accent hover:text-text1 transition-colors"
                    onclick={enterCustomMode}>personnaliser</button>
          {/if}
        {/if}
      </div>
    </div>
    {#if isReadonly}
      <textarea
        readonly
        value={displayedPrompt}
        rows={8}
        class="w-full bg-surface2/50 border border-border2/50 rounded-lg px-3 py-2 text-xs font-mono text-text2 outline-none resize-none cursor-default"
        placeholder="Prompt auto-genere"
      ></textarea>
      <div class="text-[8px] font-mono text-text2/50">prompt auto-genere — cliquer personnaliser pour editer</div>
    {:else}
      <textarea
        bind:value={systemPrompt}
        rows={5}
        class="w-full bg-surface2 border border-border2 rounded-lg px-3 py-2 text-xs font-mono text-text1 outline-none resize-none focus:border-accent/50 transition-colors placeholder:text-text2/40"
        placeholder="Instructions systeme pour l'agent…"
      ></textarea>
    {/if}
  </div>

  <!-- Sliders section -->
  <section class="flex flex-col gap-4">
    <!-- Contexte (input + output) -->
    <div>
      <div class="flex justify-between items-baseline mb-1">
        <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Contexte (input + output)</span>
        <span class="font-mono text-xs text-text1">{formatNumber(maxContextTokens)}</span>
      </div>
      <input type="range" bind:value={maxContextTokens}
             min={ranges.maxContextTokens.min} max={ranges.maxContextTokens.max} step={ranges.maxContextTokens.step}
             class="w-full accent-accent" />
    </div>

    <!-- Max output — hidden for WASM (MediaPipe has no separate output control) -->
    {#if modelType !== 'wasm'}
    <div>
      <div class="flex justify-between items-baseline mb-1">
        <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Max output</span>
        <span class="font-mono text-xs text-text1">{formatNumber(maxTokens)}</span>
      </div>
      <input type="range" bind:value={maxTokens}
             min={ranges.maxTokens.min} max={ranges.maxTokens.max} step={ranges.maxTokens.step}
             class="w-full accent-accent" />
    </div>
    {/if}

    <!-- Temperature -->
    <div>
      <div class="flex justify-between items-baseline mb-1">
        <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Temperature</span>
        <span class="font-mono text-xs text-text1">{temperature.toFixed(1)}</span>
      </div>
      <input type="range" bind:value={temperature}
             min={ranges.temperature.min} max={ranges.temperature.max} step={ranges.temperature.step}
             class="w-full accent-accent" />
    </div>

    <!-- Top-K -->
    <div>
      <div class="flex justify-between items-baseline mb-1">
        <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Top-K</span>
        <span class="font-mono text-xs text-text1">{topK}</span>
      </div>
      <input type="range" bind:value={topK}
             min={ranges.topK.min} max={ranges.topK.max} step={ranges.topK.step}
             class="w-full accent-accent" />
    </div>

    <!-- Max tools (WASM only) -->
    {#if modelType === 'wasm'}
    <div>
      <div class="flex justify-between items-baseline mb-1">
        <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Max tools (WASM)</span>
        <span class="font-mono text-xs text-text1">{maxTools}</span>
      </div>
      <input type="range" bind:value={maxTools}
             min={4} max={20} step={1}
             class="w-full accent-accent" />
    </div>
    {/if}
  </section>

  <!-- Cache -->
  <label class="flex items-center gap-2.5 cursor-pointer select-none">
    <input
      type="checkbox"
      bind:checked={cacheEnabled}
      class="accent-accent w-3.5 h-3.5"
    />
    <span class="text-xs font-mono text-text1">Prompt caching</span>
    <span class="text-[10px] font-mono text-text2 ml-auto">économise ~80% tokens</span>
  </label>
</div>
