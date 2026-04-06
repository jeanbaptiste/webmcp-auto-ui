<script lang="ts">
  interface Props {
    value: string;
    onchange: (llm: string) => void;
    class?: string;
  }
  let { value, onchange, class: cls = '' }: Props = $props();
</script>

<select class="bg-surface2 border border-border2 rounded px-3 h-9 text-sm text-text1 font-mono outline-none cursor-pointer {cls}"
  {value} onchange={(e) => onchange((e.target as HTMLSelectElement).value)}>
  <option value="haiku">claude-haiku-4-5</option>
  <option value="sonnet">claude-sonnet-4-6</option>
  <option value="gemma-e2b">Gemma E2B (WASM)</option>
  <option value="gemma-e4b">Gemma E4B (WASM)</option>
</select>
