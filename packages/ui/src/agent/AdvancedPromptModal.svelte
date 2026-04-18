<script lang="ts">
  interface Template {
    id: string;
    name: string;
    description: string;
    providerKinds: Array<'remote' | 'wasm' | 'gemma' | 'local'>;
  }

  interface Props {
    open: boolean;
    currentTemplate: string;
    providerKind: 'remote' | 'wasm' | 'gemma' | 'local';
    onselect: (templateId: string) => void;
    onclose: () => void;
  }

  let {
    open = $bindable(false),
    currentTemplate,
    providerKind,
    onselect,
    onclose,
  }: Props = $props();

  const TEMPLATES: Template[] = [
    {
      id: 'default',
      name: 'Default',
      description: 'Lazy cascade with list → search fallback, DATA/DISPLAY routing',
      providerKinds: ['remote', 'wasm', 'gemma', 'local'],
    },
    {
      id: 'gemma-google-style',
      name: 'Gemma — Google-style skill catalog',
      description: 'Baked skill list in prompt, no discovery tools. Gemma only.',
      providerKinds: ['gemma'],
    },
    {
      id: 'gemma-strict-cascade',
      name: 'Gemma — Strict 5-step cascade',
      description: 'Classic 5-step cascade (list → search → tools → search → get → execute) with "MUST NOT skip steps" rule. Gemma only.',
      providerKinds: ['gemma'],
    },
    {
      id: 'ghost',
      name: 'Gemma — Ghost (Claude port)',
      description: 'Current Claude prompt (post-fixes) translated to Gemma tool-declaration syntax. Gemma only.',
      providerKinds: ['gemma'],
    },
  ];

  function close() {
    open = false;
    onclose();
  }

  function handleSelect(t: Template) {
    if (!t.providerKinds.includes(providerKind)) return;
    onselect(t.id);
    close();
  }
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-6"
       onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <!-- Panel -->
    <div class="w-full max-w-lg bg-surface border border-border2 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
      <!-- Header -->
      <div class="flex items-center gap-3 px-5 py-3 border-b border-border flex-shrink-0">
        <span class="font-mono text-sm font-bold text-text1">Advanced Prompt Templates</span>
        <div class="flex-1"></div>
        <button class="text-text2 hover:text-text1 font-mono text-base leading-none transition-colors"
                onclick={close}>x</button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {#each TEMPLATES as t (t.id)}
          {@const available = t.providerKinds.includes(providerKind)}
          {@const active = t.id === currentTemplate}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div
            class="rounded-lg border p-3 flex flex-col gap-1 transition-colors
                   {active ? 'border-accent bg-accent/5' : 'border-border2 bg-surface2/30'}
                   {available ? 'cursor-pointer hover:border-accent hover:bg-accent/5' : 'opacity-40 cursor-not-allowed'}"
            onclick={() => handleSelect(t)}
          >
            <div class="flex items-center gap-2">
              {#if active}
                <span class="flex-shrink-0 w-4 h-4 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px]">&#x2713;</span>
              {/if}
              <span class="font-mono text-xs font-bold text-text1">{t.name}</span>
              {#if !available}
                <span class="font-mono text-[9px] text-text2/60 ml-auto">— not available for this provider</span>
              {/if}
            </div>
            <div class="font-mono text-[11px] text-text2 leading-relaxed {active ? 'pl-6' : ''}">{t.description}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}
