<script lang="ts">
  interface DiagnosticItem {
    severity: 'error' | 'warning';
    title: string;
    detail: string;
    quickFix?: string;
    codeFix?: string;
  }

  interface DebugLayer {
    protocol: string;
    serverName?: string;
    toolCount?: number;
  }

  interface DebugInfo {
    estimatedTokens: number;
    layerCount: number;
    toolCount: number;
    mcpToolCount: number;
    recipeCount: number;
    layers: DebugLayer[];
    prompt: string;
  }

  interface Props {
    open: boolean;
    diagnostics: DiagnosticItem[];
    onclose: () => void;
    debugInfo?: DebugInfo;
  }

  let { open = $bindable(false), diagnostics, onclose, debugInfo }: Props = $props();

  let activeTab = $state<'diagnostics' | 'debug'>('diagnostics');

  let expandedQuickFix = $state<Set<number>>(new Set());
  let expandedCodeFix = $state<Set<number>>(new Set());

  function toggleQuickFix(i: number) {
    const next = new Set(expandedQuickFix);
    if (next.has(i)) next.delete(i); else next.add(i);
    expandedQuickFix = next;
  }

  function toggleCodeFix(i: number) {
    const next = new Set(expandedCodeFix);
    if (next.has(i)) next.delete(i); else next.add(i);
    expandedCodeFix = next;
  }

  async function copyText(text: string) {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  }

  function close() { open = false; onclose(); }
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
       onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <!-- Panel -->
    <div class="w-full max-w-lg bg-surface border border-border2 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
      <!-- Header -->
      <div class="flex items-center gap-3 px-5 py-3 border-b border-border flex-shrink-0">
        <span class="font-mono text-sm font-bold text-text1">Diagnostics</span>
        <span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-mono font-bold
                     {diagnostics.some(d => d.severity === 'error') ? 'bg-accent2/20 text-accent2' : 'bg-amber-500/20 text-amber-500'}">
          {diagnostics.length}
        </span>
        <div class="flex-1"></div>
        <button class="text-text2 hover:text-text1 font-mono text-base leading-none transition-colors"
                onclick={close}>x</button>
      </div>

      <!-- Tabs (only shown when debugInfo is provided) -->
      {#if debugInfo}
        <div class="flex border-b border-border flex-shrink-0">
          <button
            class="px-5 py-2 font-mono text-xs transition-colors border-b-2
                   {activeTab === 'diagnostics' ? 'border-accent text-text1' : 'border-transparent text-text2 hover:text-text1'}"
            onclick={() => activeTab = 'diagnostics'}>
            Diagnostics
          </button>
          <button
            class="px-5 py-2 font-mono text-xs transition-colors border-b-2
                   {activeTab === 'debug' ? 'border-accent text-text1' : 'border-transparent text-text2 hover:text-text1'}"
            onclick={() => activeTab = 'debug'}>
            Debug
          </button>
        </div>
      {/if}

      <!-- Body: Diagnostics tab -->
      {#if !debugInfo || activeTab === 'diagnostics'}
        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {#if diagnostics.length === 0}
            <div class="font-mono text-xs text-text2 text-center py-8">Aucun probleme detecte.</div>
          {:else}
            {#each diagnostics as diag, i}
              <div class="rounded-lg border p-3 flex flex-col gap-1.5
                         {diag.severity === 'error' ? 'border-accent2/30 bg-accent2/5' : 'border-amber-500/30 bg-amber-500/5'}">
                <!-- Severity icon + title -->
                <div class="flex items-start gap-2">
                  {#if diag.severity === 'error'}
                    <span class="flex-shrink-0 w-4 h-4 rounded-full bg-accent2/20 text-accent2 flex items-center justify-center text-[10px] mt-0.5">!</span>
                  {:else}
                    <span class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-amber-500 text-xs mt-0.5">&#x26A0;</span>
                  {/if}
                  <span class="font-mono text-xs font-bold text-text1">{diag.title}</span>
                </div>
                <!-- Detail -->
                <div class="font-mono text-[11px] text-text2 leading-relaxed pl-6">{diag.detail}</div>

                <!-- Quick fix -->
                {#if diag.quickFix}
                  <div class="pl-6">
                    <button class="font-mono text-[10px] text-accent hover:underline cursor-pointer"
                            onclick={() => toggleQuickFix(i)}>
                      {expandedQuickFix.has(i) ? '- Quick fix (prompt)' : '+ Quick fix (prompt)'}
                    </button>
                    {#if expandedQuickFix.has(i)}
                      <div class="mt-1 relative">
                        <pre class="bg-surface2 border border-border2 rounded p-2 text-[10px] font-mono text-text2 whitespace-pre-wrap break-words">{diag.quickFix}</pre>
                        <button class="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-surface border border-border2 text-text2 hover:text-text1 transition-colors"
                                onclick={() => copyText(diag.quickFix!)}>Copier</button>
                      </div>
                    {/if}
                  </div>
                {/if}

                <!-- Code fix -->
                {#if diag.codeFix}
                  <div class="pl-6">
                    <button class="font-mono text-[10px] text-teal hover:underline cursor-pointer"
                            onclick={() => toggleCodeFix(i)}>
                      {expandedCodeFix.has(i) ? '- Fix (code)' : '+ Fix (code)'}
                    </button>
                    {#if expandedCodeFix.has(i)}
                      <pre class="mt-1 bg-surface2 border border-border2 rounded p-2 text-[10px] font-mono text-text2 whitespace-pre-wrap break-words">{diag.codeFix}</pre>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      {/if}

      <!-- Body: Debug tab -->
      {#if debugInfo && activeTab === 'debug'}
        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <!-- Stats grid -->
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <span class="text-text2">Prompt tokens (est.)</span>
            <span class="text-text1 font-mono">{debugInfo.estimatedTokens.toLocaleString()}</span>
            <span class="text-text2">Active layers</span>
            <span class="text-text1 font-mono">{debugInfo.layerCount}</span>
            <span class="text-text2">Tools sent</span>
            <span class="text-text1 font-mono">{debugInfo.toolCount} <span class="text-text2">(MCP: {debugInfo.mcpToolCount}, UI: {debugInfo.toolCount - debugInfo.mcpToolCount})</span></span>
            <span class="text-text2">Recipes</span>
            <span class="text-text1 font-mono">{debugInfo.recipeCount}</span>
          </div>

          <!-- Layers -->
          <div>
            <div class="text-[9px] text-text2 uppercase tracking-wider mb-1">Layers</div>
            <div class="flex flex-col gap-1">
              {#each debugInfo.layers as layer, i}
                <div class="text-[10px] font-mono text-text1 px-2 py-1 bg-surface2/50 rounded">
                  [{i}] {layer.protocol}
                  {#if layer.serverName}— {layer.serverName}{/if}
                  {#if layer.toolCount !== undefined}({layer.toolCount} tools){/if}
                </div>
              {/each}
            </div>
          </div>

          <!-- System prompt -->
          <div>
            <div class="text-[9px] text-text2 uppercase tracking-wider mb-1">System Prompt</div>
            <pre class="text-[9px] text-text1 bg-surface2/50 rounded p-2 max-h-[300px] overflow-auto whitespace-pre-wrap break-all">{debugInfo.prompt}</pre>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
