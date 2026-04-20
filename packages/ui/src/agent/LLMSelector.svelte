<script lang="ts">
  import { listTransformersModels } from '@webmcp-auto-ui/agent';

  export interface ModelOption {
    value: string;
    label: string;
    group: 'remote' | 'wasm' | 'transformers' | 'local';
  }

  const transformersOptions: ModelOption[] = listTransformersModels().map(({ id, entry }) => ({
    value: id,
    label: entry.label,
    group: 'transformers' as const,
  }));

  const DEFAULT_MODELS: ModelOption[] = [
    { value: 'haiku',     label: 'claude-haiku-4-5',      group: 'remote' },
    { value: 'gemma-e2b', label: 'Gemma E2B (MediaPipe)', group: 'wasm'   },
    { value: 'gemma-e4b', label: 'Gemma E4B (MediaPipe)', group: 'wasm'   },
    ...transformersOptions,
  ];

  const GROUP_LABELS: Record<string, string> = {
    remote:       'Remote',
    wasm:         'In-Browser (MediaPipe)',
    transformers: 'In-Browser (Transformers.js)',
    local:        'Local',
  };

  interface Props {
    value: string;
    onchange: (llm: string) => void;
    models?: ModelOption[];
    class?: string;
  }
  let { value, onchange, models = DEFAULT_MODELS, class: cls = '' }: Props = $props();

  const groups = $derived(
    ['remote', 'wasm', 'transformers', 'local'].filter(g => models.some(m => m.group === g))
  );
</script>

<select
  class="bg-surface2 border border-border2 rounded px-3 h-9 text-sm text-text1 font-mono outline-none cursor-pointer {cls}"
  {value}
  onchange={(e) => onchange((e.target as HTMLSelectElement).value)}
>
  {#each groups as group}
    {#if groups.length > 1}
      <optgroup label={GROUP_LABELS[group] ?? group}>
        {#each models.filter(m => m.group === group) as m}
          <option value={m.value}>{m.label}</option>
        {/each}
      </optgroup>
    {:else}
      {#each models.filter(m => m.group === group) as m}
        <option value={m.value}>{m.label}</option>
      {/each}
    {/if}
  {/each}
</select>
