<script lang="ts">
  import { X } from 'lucide-svelte';

  interface Props {
    show: boolean;
    systemPrompt: string;
    maxTokens: number;
    cacheEnabled: boolean;
    onclose: () => void;
    onsystemprompt: (v: string) => void;
    onmaxtokens: (v: number) => void;
    oncache: (v: boolean) => void;
  }
  let { show, systemPrompt, maxTokens, cacheEnabled, onclose, onsystemprompt, onmaxtokens, oncache }: Props = $props();
</script>

{#if show}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-surface border border-border2 rounded-xl w-[500px] max-h-[85vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between px-5 py-4 border-b border-border">
        <span class="text-sm font-mono text-text1">Settings</span>
        <button onclick={onclose} class="text-text2 hover:text-text1"><X size={16} /></button>
      </div>
      <div class="flex-1 overflow-auto p-5 flex flex-col gap-4">
        <div>
          <label class="text-xs font-mono text-text2 mb-1 block">System prompt</label>
          <textarea class="w-full font-mono text-xs bg-black/30 border border-border text-text1 rounded-lg p-3 h-24 outline-none resize-vertical leading-relaxed focus:border-accent"
            placeholder="Instructions personnalisees pour le LLM..."
            value={systemPrompt}
            oninput={(e) => onsystemprompt((e.target as HTMLTextAreaElement).value)}></textarea>
        </div>
        <div>
          <label class="text-xs font-mono text-text2 mb-1 block">Contexte max tokens : {maxTokens}</label>
          <input type="range" min="1024" max="8192" step="256" class="w-full accent-accent"
            value={maxTokens}
            oninput={(e) => onmaxtokens(Number((e.target as HTMLInputElement).value))} />
          <div class="flex justify-between text-[10px] font-mono text-text2">
            <span>1024</span><span>8192</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="accent-accent"
              checked={cacheEnabled}
              onchange={(e) => oncache((e.target as HTMLInputElement).checked)} />
            <span class="text-xs font-mono text-text2">KV cache</span>
          </label>
        </div>
      </div>
      <div class="flex justify-end gap-3 px-5 py-4 border-t border-border">
        <button class="font-mono text-xs px-4 py-2 rounded border border-border2 text-text2 hover:text-text1" onclick={onclose}>fermer</button>
      </div>
    </div>
  </div>
{/if}
