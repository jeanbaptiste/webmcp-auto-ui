<script lang="ts">
  import { untrack } from 'svelte';

  interface Props {
    systemPrompt?: string;
    maxTokens?: number;
    maxContextTokens?: number;
    cacheEnabled?: boolean;
    class?: string;
  }

  let {
    systemPrompt = $bindable(''),
    maxTokens = $bindable(4096),
    maxContextTokens = $bindable(150_000),
    cacheEnabled = $bindable(true),
    class: cls = '',
  }: Props = $props();

  let promptSaved = $state(false);
  let savedTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    systemPrompt; // track changes
    untrack(() => {
      if (savedTimer) clearTimeout(savedTimer);
      promptSaved = true;
      savedTimer = setTimeout(() => { promptSaved = false; }, 2000);
    });
  });
</script>

<div class="flex flex-col gap-4 {cls}">
  <!-- System prompt -->
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <label class="text-[9px] font-mono text-text2 uppercase tracking-wider">System Prompt</label>
      {#if promptSaved}
        <span class="text-[9px] font-mono text-teal transition-opacity">✓ appliqué</span>
      {/if}
    </div>
    <textarea
      bind:value={systemPrompt}
      rows={5}
      class="w-full bg-surface2 border border-border2 rounded-lg px-3 py-2 text-xs font-mono text-text1 outline-none resize-none focus:border-accent/50 transition-colors placeholder:text-text2/40"
      placeholder="Instructions système pour l'agent…"
    ></textarea>
  </div>

  <!-- Max tokens -->
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <label class="text-[9px] font-mono text-text2 uppercase tracking-wider">Max tokens <span class="normal-case opacity-60">(output)</span></label>
      <span class="text-[10px] font-mono text-text1">{maxTokens.toLocaleString()}</span>
    </div>
    <input
      type="range"
      bind:value={maxTokens}
      min={256}
      max={8192}
      step={256}
      class="w-full accent-accent"
    />
  </div>

  <!-- Max context tokens -->
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <label class="text-[9px] font-mono text-text2 uppercase tracking-wider">Max contexte <span class="normal-case opacity-60">(historique, tokens)</span></label>
      <span class="text-[10px] font-mono text-text1">{(maxContextTokens / 1000).toFixed(0)}K</span>
    </div>
    <input
      type="range"
      bind:value={maxContextTokens}
      min={10_000}
      max={200_000}
      step={10_000}
      class="w-full accent-accent"
    />
  </div>

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
