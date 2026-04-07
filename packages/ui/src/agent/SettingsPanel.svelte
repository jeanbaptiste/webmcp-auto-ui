<script lang="ts">
  interface Props {
    systemPrompt?: string;
    maxTokens?: number;
    cacheEnabled?: boolean;
    class?: string;
  }

  let {
    systemPrompt = $bindable(''),
    maxTokens = $bindable(4096),
    cacheEnabled = $bindable(true),
    class: cls = '',
  }: Props = $props();
</script>

<div class="flex flex-col gap-4 {cls}">
  <!-- System prompt -->
  <div class="flex flex-col gap-1.5">
    <label class="text-[9px] font-mono text-text2 uppercase tracking-wider">System Prompt</label>
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
      <label class="text-[9px] font-mono text-text2 uppercase tracking-wider">Max tokens</label>
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
